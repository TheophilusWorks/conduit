import { EventEmitter } from "events";
import { createMessengerBot, MessengerBot } from "@dongdev/fca-unofficial";
import {
  CollectorOptions,
  CollectorPayload,
  ConduitCacheConfig,
  ConduitClientConfig,
  ConduitCredentials,
  ConduitEvents,
  ConduitMessageBody,
  ConduitQueueConfig,
  MessageCreatePayload,
  MessageRespondPayload,
  MessageRemovePayload,
  MessageReactPayload,
  MessageWritingPayload,
  MessageReadPayload,
  Middleware,
  UserInfo,
} from "../types.js";
import { ConduitError } from "../errors/ConduitError.js";
import { ConduitMessagesAPI } from "../api/ConduitMessagesAPI.js";
import { ConduitThreadsAPI } from "../api/ConduitThreadsAPI.js";
import { ConduitUsersAPI } from "../api/ConduitUsersAPI.js";
import { ConduitAccountAPI } from "../api/ConduitAccountAPI.js";
import { ConduitQueue } from "../utils/ConduitQueue.js";
import { ConduitMessageBuilder } from "../builders/ConduitMessageBuilder.js";
import { ConduitSlidingCache } from "../utils/ConduitSlidingCache.js";
import { ConduitMessageCollector } from "../utils/ConduitMessageCollector.js";

// ─── FCA → Conduit event dispatch map ────────────────────────────────────────

/**
 * Maps FCA `logMessageType` values to their corresponding Conduit fan-out events.
 */
const LOG_TYPE_TO_CONDUIT_EVENT: Record<string, keyof ConduitEvents> = {
  "log:subscribe": "user:create",
  "log:unsubscribe": "user:remove",
  "log:thread-name": "thread:title_change",
  "log:thread-image": "thread:photo_replaced",
  "log:thread-color": "thread:theme_changed",
  "log:user-nickname": "thread:nickname_changed",
  "log:thread-admins": "thread:admin_changed",
};

/**
 * High-level Messenger client built on top of the FCA unofficial API.
 *
 * Provides:
 * - middleware-based event system (Koa-style)
 * - typed APIs for messages, threads, users, and account control
 * - automatic event enrichment and dispatch layer
 * - internal typed event bus for {@link ConduitMessageCollector} and {@link waitResponse}
 *
 * All FCA events are funneled through dedicated FCA event bindings,
 * normalized, enriched with helper methods, then dispatched onto both
 * the middleware stack and the internal typed event bus.
 *
 * @example
 * ```ts
 * const conduit = new ConduitClient(config);
 * await conduit.login(credentials);
 *
 * conduit.on("message:create", async (ctx, next) => {
 *   console.log(ctx.body);
 *   await next();
 * });
 * ```
 */
export class ConduitClient {
  /** Underlying FCA bot instance. Null until {@link login} resolves. */
  private _client: MessengerBot | null = null;

  /**
   * Internal typed event bus.
   *
   * All FCA events are normalized and re-emitted here using Conduit event
   * names so that {@link ConduitMessageCollector} and {@link waitResponse}
   * receive fully enriched, correctly typed payloads instead of raw FCA data.
   */
  private _eventBus: EventEmitter = new EventEmitter();

  /** Whether FCA event bindings have been initialized. */
  private _fcaBound = false;

  /** Lazy API: message operations. */
  private _messages: ConduitMessagesAPI | null = null;

  /** Lazy API: thread operations. */
  private _threads: ConduitThreadsAPI | null = null;

  /** Lazy API: user operations. */
  private _users: ConduitUsersAPI | null = null;

  /** Lazy API: account operations. */
  private _account: ConduitAccountAPI | null = null;

  /** Queue for message operations (optional feature). */
  private _messageQueue: ConduitQueue | null = null;

  /** Queue for thread operations (optional feature). */
  private _threadQueue: ConduitQueue | null = null;

  /** User cache stored after fetching. */
  private _userCache: ConduitSlidingCache<UserInfo> | null = null;

  /** Runtime configuration passed to FCA layer. */
  private config: ConduitClientConfig;

  /**
   * Middleware registry per Conduit event.
   * Each event holds a stack executed sequentially via {@link runStack}.
   */
  private middlewares: Map<
    keyof ConduitEvents,
    Middleware<keyof ConduitEvents>[]
  > = new Map();

  /**
   * @param config - Client configuration passed to the underlying FCA bot.
   */
  constructor(config: ConduitClientConfig) {
    this.config = {
      ...config,
      logLevel: config.logLevel ?? "silent",
    };
  }

  // ─── Lazy APIs ─────────────────────────────────────────────────────────────

  /**
   * Message-level API for sending, replying, reacting, and editing messages.
   *
   * @remarks
   * When message queueing is enabled, all operations execute sequentially
   * with controlled delays to reduce rate-limit risk.
   */
  get messages(): ConduitMessagesAPI {
    return (this._messages ??= new ConduitMessagesAPI(
      this.client,
      this._eventBus,
      this.config.queue?.messageQueue ? this.messageQueue : undefined,
    ));
  }

  /**
   * Thread management API.
   *
   * Handles participants, metadata updates, polls, and group operations.
   */
  get threads(): ConduitThreadsAPI {
    return (this._threads ??= new ConduitThreadsAPI(
      this.client,
      this.config.queue?.threadQueue ? this.threadQueue : undefined,
    ));
  }

  /**
   * User-related API for profiles and social graph queries.
   */
  get users(): ConduitUsersAPI {
    return (this._users ??= new ConduitUsersAPI(
      this.client,
      this.config.cache?.cacheUsers ? this.config.cache.cacheUsers : undefined,
      this.userCache,
    ));
  }

  /**
   * Account-level API for authentication session operations.
   */
  get account(): ConduitAccountAPI {
    return (this._account ??= new ConduitAccountAPI(this.client));
  }

  /** Lazy message queue instance. */
  private get messageQueue(): ConduitQueue {
    return (this._messageQueue ??= new ConduitQueue(
      this.config.queue?.messageQueue ?? ({} as ConduitQueueConfig),
    ));
  }

  /** Lazy thread queue instance. */
  private get threadQueue(): ConduitQueue {
    return (this._threadQueue ??= new ConduitQueue(
      this.config.queue?.threadQueue ?? ({} as ConduitQueueConfig),
    ));
  }

  /** Lazy user cache instance. */
  private get userCache(): ConduitSlidingCache<UserInfo> {
    return (this._userCache ??= new ConduitSlidingCache(
      this.config.cache?.cacheUsers ?? ({} as ConduitCacheConfig),
    ));
  }

  // ─── Auth ──────────────────────────────────────────────────────────────────

  /**
   * Authenticates with Messenger and initializes the FCA client.
   *
   * Must be called before using any API or event system.
   *
   * @param credentials - Authentication method (appstate, cookies, or email/password).
   * @returns The same client instance for chaining.
   *
   * @remarks
   * Email/password login is unstable and may trigger checkpoints.
   */
  public async login(credentials: ConduitCredentials): Promise<this> {
    this._client = await createMessengerBot(
      {
        appState: credentials.appstate,
        Cookie: credentials.cookies,
        email: credentials.account?.email,
        password: credentials.account?.password,
      },
      this.config,
    );

    this.bindFcaEvents();

    return this;
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Registers middleware for a Conduit event.
   *
   * Middleware executes sequentially and must call `next()` to continue
   * the chain. Multiple middlewares can be registered per event.
   *
   * @param event - The Conduit event name to listen for.
   * @param middlewares - Ordered middleware stack to register.
   *
   * @example
   * ```ts
   * client.on("message:create", async (ctx, next) => {
   *   if (ctx.body === "ping") return ctx.reply("pong");
   *   await next();
   * });
   * ```
   */
  public on<K extends keyof ConduitEvents>(
    event: K,
    ...middlewares: Middleware<K>[]
  ): this {
    if (!this.middlewares.has(event)) {
      this.middlewares.set(event, []);
    }

    this.middlewares
      .get(event)!
      .push(...(middlewares as Middleware<keyof ConduitEvents>[]));

    return this;
  }

  /**
   * Registers middleware on raw FCA events, bypassing the Conduit
   * enrichment layer entirely.
   *
   * Useful for unsupported or experimental FCA events not yet mapped
   * to Conduit event names.
   *
   * @param event - Raw FCA event name.
   * @param middlewares - Ordered middleware stack to register.
   */
  public onFca(
    event: string,
    ...middlewares: ((data: any, next?: () => Promise<void>) => Promise<void>)[]
  ): this {
    this.client.on(event, async (data: any) => {
      await this.runStack(
        middlewares as Middleware<keyof ConduitEvents>[],
        data,
      );
    });
    return this;
  }

  /**
   * Raw FCA API access without type safety.
   *
   * Use only when Conduit APIs do not expose the functionality you need.
   *
   * @example
   * ```ts
   * client.api.getThreadList(10, null, ["INBOX"]);
   * ```
   */
  public get api(): any {
    return this.client.ctx.api;
  }

  /**
   * Creates a {@link ConduitMessageCollector} backed by the internal typed event bus.
   *
   * Collectors receive fully enriched Conduit payloads, not raw FCA events.
   * The payload type is automatically derived as a union of all event payloads
   * in the `events` array.
   *
   * @param options - Configuration for the collector.
   * @returns A running `ConduitMessageCollector` instance.
   *
   * @example
   * ```ts
   * const collector = client.collect({
   *   timeout: 30_000,
   *   events: ["message:respond", "message:react"] as const,
   * });
   *
   * collector.on("collect", (event) => {
   *   if (event.type === "message:react") console.log(event.reaction);
   *   else console.log(event.body);
   * });
   * ```
   */
  public collect<
    K extends readonly (keyof ConduitEvents)[] = ["message:respond"],
  >(options: CollectorOptions<K>): ConduitMessageCollector<K> {
    return new ConduitMessageCollector(this._eventBus, options);
  }

  /**
   * Waits for a single matching message and resolves with it.
   *
   * Internally creates a {@link ConduitMessageCollector} with `max: 1` and
   * resolves on the first collected payload, or rejects on timeout.
   *
   * @param options - Collector options minus `max`, which is forced to `1`.
   * @returns A promise resolving with the first matching payload.
   *
   * @example
   * ```ts
   * const reply = await client.waitResponse({
   *   timeout: 15_000,
   *   filter: (msg) => msg.senderID === expectedID,
   * });
   * ```
   */
  public waitResponse<
    K extends readonly (keyof ConduitEvents)[] = ["message:respond"],
  >(
    eventsOrOptions?: K | Omit<CollectorOptions<K>, "max">,
    options?: Omit<CollectorOptions<K>, "max">,
  ): Promise<CollectorPayload<K>> {
    const events = Array.isArray(eventsOrOptions)
      ? (eventsOrOptions as K)
      : undefined;
    const opts =
      (Array.isArray(eventsOrOptions) ? options : eventsOrOptions) ?? {};

    return new Promise((resolve, reject) => {
      const collector = this.collect<K>({
        ...opts,
        ...(events ? { events } : {}),
        max: 1,
      } as CollectorOptions<K>);

      collector.once("collect", (message) => {
        collector.stop("fulfilled");
        resolve(message as CollectorPayload<K>);
      });

      collector.once("end", (_, reason) => {
        if (reason === "timeout") reject(new Error("waitResponse timed out"));
      });
    });
  }

  // ─── FCA Binding ───────────────────────────────────────────────────────────

  /**
   * Binds all FCA event listeners once after login.
   *
   * Runs only once — subsequent calls are no-ops.
   */
  private bindFcaEvents(): void {
    if (this._fcaBound) return;
    this._fcaBound = true;

    this.bindMessageEvents();
    this.bindThreadEvents();
  }

  /**
   * Binds FCA message-related events and dispatches to typed Conduit events.
   *
   * FCA event → Conduit event mapping:
   * - `"message"` with no reply context → `message:create`
   * - `"message"` with `messageReply`   → `message:respond`
   * - `"message_reply"`                 → `message:respond`
   * - `"message_reaction"`              → `message:react`
   * - `"message"` with `message_unsend` → `message:remove`
   * - `"message"` with `typ`            → `message:writing`
   * - `"message"` with `read_receipt`   → `message:read`
   */
  private bindMessageEvents(): void {
    this.client.on("message", async (raw: any) => {
      const { type } = raw;

      if (type === "message") {
        if (raw.messageReply) {
          await this.dispatch(
            "message:respond",
            this.enrichReplyable<MessageRespondPayload>(raw, "message:respond"),
          );
        } else {
          await this.dispatch(
            "message:create",
            this.enrichReplyable<MessageCreatePayload>(raw, "message:create"),
          );
        }
        return;
      }

      if (type === "message_unsend") {
        await this.dispatch(
          "message:remove",
          this.enrichSendable<MessageRemovePayload>(raw, "message:remove"),
        );
        return;
      }

      if (type === "typ") {
        await this.dispatch(
          "message:writing",
          this.enrichSendable<MessageWritingPayload>(raw, "message:writing"),
        );
        return;
      }

      if (type === "read_receipt") {
        await this.dispatch(
          "message:read",
          this.enrichSendable<MessageReadPayload>(raw, "message:read"),
        );
        return;
      }
    });

    // dedicated FCA events as fallback bindings
    this.client.on("message_unsend", async (raw: any) => {
      await this.dispatch(
        "message:remove",
        this.enrichSendable<MessageRemovePayload>(raw, "message:remove"),
      );
    });

    this.client.on("typ", async (raw: any) => {
      await this.dispatch(
        "message:writing",
        this.enrichSendable<MessageWritingPayload>(raw, "message:writing"),
      );
    });

    this.client.on("read_receipt", async (raw: any) => {
      await this.dispatch(
        "message:read",
        this.enrichSendable<MessageReadPayload>(raw, "message:read"),
      );
    });

    this.client.on("message_reaction", async (raw: any) => {
      await this.dispatch(
        "message:react",
        this.enrichSendable<MessageReactPayload>(raw, "message:react"),
      );
    });

    this.client.on("message_reply", async (raw: any) => {
      await this.dispatch(
        "message:respond",
        this.enrichReplyable<MessageRespondPayload>(raw, "message:respond"),
      );
    });
  }

  /**
   * Binds the FCA `"threadUpdate"` event and fan-outs to specific Conduit
   * thread and user events based on `logMessageType`.
   *
   * Always dispatches `thread:update`, then additionally dispatches the
   * specific sub-event if the `logMessageType` is recognized.
   */
  private bindThreadEvents(): void {
    this.client.on("threadUpdate", async (raw: any) => {
      const {
        threadID,
        author,
        participantIDs,
        logMessageType,
        logMessageData,
      } = raw;

      const base = {
        threadID,
        author,
        participantIDs,
        logMessageType,
        logMessageData,
      };

      const withSend = {
        ...base,
        type: "thread:update" as const,
        send: (body: ConduitMessageBuilder | string | ConduitMessageBody) =>
          this.messages.send(body, threadID),
      };

      await this.dispatch("thread:update", withSend);

      const conduitEvent = LOG_TYPE_TO_CONDUIT_EVENT[logMessageType];
      if (!conduitEvent) return;

      await this.dispatch(conduitEvent, {
        ...withSend,
        type: conduitEvent,
        ...this.enrichThreadFanOut(conduitEvent, raw),
      });
    });
  }

  // ─── Enrichment ────────────────────────────────────────────────────────────

  /**
   * Enriches a raw FCA payload with the full set of replyable helpers:
   * `send()`, `reply()`, `react()`, `collect()`, and `waitResponse()`.
   *
   * Also stamps `type` onto the payload for discriminated union narrowing.
   *
   * Used for `message:create` and `message:respond` events.
   *
   * @param raw - Raw FCA payload.
   * @param type - The Conduit event name to stamp as `type`.
   */
  private enrichReplyable<T>(raw: any, type: keyof ConduitEvents): T {
    const { threadID, messageID } = raw;
    return {
      ...raw,
      type,
      send: (body: ConduitMessageBuilder | string | ConduitMessageBody) =>
        this.messages.send(body, threadID),
      reply: (body: any) => this.messages.reply(body, threadID, messageID),
      react: (emoji: string) => this.messages.react(emoji, messageID, threadID),
      collect: <
        K extends readonly (keyof ConduitEvents)[] = ["message:respond"],
      >(
        options?: CollectorOptions<K>,
      ) => this.collect<K>(options ?? {}),
      waitResponse: <
        K extends readonly (keyof ConduitEvents)[] = ["message:respond"],
      >(
        eventsOrOptions?: K | Omit<CollectorOptions<K>, "max">,
        options?: Omit<CollectorOptions<K>, "max">,
      ) => this.waitResponse<K>(eventsOrOptions as any, options),
    } as T;
  }

  /**
   * Enriches a raw FCA payload with only `send()`.
   *
   * Also stamps `type` onto the payload for discriminated union narrowing.
   *
   * Used for non-replyable events: `message:react`, `message:remove`,
   * `message:writing`, and `message:read`.
   *
   * @param raw - Raw FCA payload.
   * @param type - The Conduit event name to stamp as `type`.
   */
  private enrichSendable<T>(raw: any, type: keyof ConduitEvents): T {
    const { threadID } = raw;
    return {
      ...raw,
      type,
      send: (body: ConduitMessageBuilder | string | ConduitMessageBody) =>
        this.messages.send(body, threadID),
    } as T;
  }

  /**
   * Produces the extra fields for thread fan-out events based on `logMessageType`.
   *
   * Thread and user events additionally receive `changeNickname()` and
   * `changeAdminStatus()` management helpers.
   *
   * @param event - The specific Conduit fan-out event being dispatched.
   * @param raw - Raw FCA threadUpdate payload.
   */
  private enrichThreadFanOut(
    event: keyof ConduitEvents,
    raw: any,
  ): Record<string, any> {
    const { threadID, logMessageData } = raw;

    const manageable = {
      changeNickname: (nickname: string, userID: string) =>
        this.threads.changeNickname(nickname, threadID, userID),
      changeAdminStatus: (userID: string, isAdmin: boolean) =>
        this.threads.changeAdminStatus(userID, threadID, isAdmin),
    };

    switch (event) {
      case "thread:title_change":
        return { ...manageable, name: logMessageData?.name };

      case "thread:photo_replaced":
        return {
          ...manageable,
          image: logMessageData?.image,
          timestamp: raw.timestamp,
        };

      case "thread:theme_changed":
        return {
          ...manageable,
          themeColor: logMessageData?.theme_color,
          gradient: logMessageData?.gradient,
          themeID: logMessageData?.theme_id,
          accessibilityLabel: logMessageData?.accessibility_label,
          themeName: logMessageData?.theme_name,
          themeEmoji: logMessageData?.theme_emoji,
        };

      case "thread:nickname_changed":
        return {
          ...manageable,
          participantID: logMessageData?.participant_id,
          nickname: logMessageData?.nickname,
        };

      case "thread:admin_changed":
        return {
          ...manageable,
          targetID: logMessageData?.TARGET_ID,
          adminEvent: logMessageData?.ADMIN_EVENT,
        };

      case "user:create":
        return { addedParticipants: logMessageData?.addedParticipants ?? [] };

      case "user:remove":
        return { leftParticipantFbID: logMessageData?.leftParticipantFbID };

      default:
        return {};
    }
  }

  // ─── Dispatch ──────────────────────────────────────────────────────────────

  /**
   * Emits an enriched payload on both the internal event bus and the
   * middleware stack for the given Conduit event.
   *
   * The event bus emission makes the payload available to active
   * {@link ConduitMessageCollector} instances. The middleware stack
   * emission runs all registered `client.on()` handlers.
   *
   * @param event - The Conduit event name.
   * @param payload - The fully enriched payload to dispatch.
   */
  private async dispatch(
    event: keyof ConduitEvents,
    payload: any,
  ): Promise<void> {
    this._eventBus.emit(event, payload);

    const stack = this.middlewares.get(event) ?? [];
    if (stack.length) {
      await this.runStack(stack, payload);
    }
  }

  // ─── Internals ─────────────────────────────────────────────────────────────

  /**
   * Internal FCA client instance.
   *
   * @throws {ConduitError} If accessed before {@link login} resolves.
   */
  private get client(): MessengerBot {
    if (this._client) return this._client;
    throw ConduitError.uninitializedClient();
  }

  /**
   * Executes a middleware stack sequentially.
   *
   * Each middleware receives the enriched payload and a `next` function.
   * Execution halts if a middleware does not call `next()`.
   *
   * @param stack - The ordered middleware stack to execute.
   * @param data - The enriched payload to pass to each middleware.
   */
  private async runStack(
    stack: Middleware<keyof ConduitEvents>[],
    data: any,
  ): Promise<void> {
    let i = 0;
    const next = async () => {
      if (i < stack.length) await stack[i++](data as never, next);
    };
    await next();
  }
}
