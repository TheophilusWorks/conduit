import { createMessengerBot, MessengerBot } from "@dongdev/fca-unofficial";
import {
  ConduitCacheConfig,
  ConduitClientConfig,
  ConduitCredentials,
  ConduitEvents,
  ConduitMessageBody,
  ConduitQueueConfig,
  Middleware,
  UserInfo,
} from "../types.js";
import { toFcaEvent } from "../utils/toFcaEvent.js";
import { ConduitError } from "../errors/ConduitError.js";
import { ConduitMessagesAPI } from "../api/ConduitMessagesAPI.js";
import { ConduitThreadsAPI } from "../api/ConduitThreadsAPI.js";
import { ConduitUsersAPI } from "../api/ConduitUsersAPI.js";
import { ConduitAccountAPI } from "../api/ConduitAccountAPI.js";
import { ConduitQueue } from "../utils/ConduitQueue.js";
import { ConduitMessageBuilder } from "../builders/ConduitMessageBuilder.js";
import { ConduitSlidingCache } from "../utils/ConduitSlidingCache.js";

const FANOUT_EVENTS = new Set<keyof ConduitEvents>([
  "user:create",
  "user:remove",
  "thread:update",
  "thread:title_change",
  "thread:photo_replaced",
  "thread:theme_changed",
  "thread:nickname_changed",
  "thread:admin_changed",
]);

const MESSAGE_REPLYABLE = new Set<keyof ConduitEvents>([
  "message:create",
  "message:respond",
]);

const LOG_MESSAGE_TYPE_MAP: Record<string, keyof ConduitEvents> = {
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
 * - automatic event enrichment layer
 *
 * This class is the main entry point of Conduit.
 *
 * @example
 * ```ts
 * const conduit = new ConduitClient(config);
 *
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
  private _client: MessengerBot | null;

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

  /** A list of user cache stored after fetching */
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
  >;

  /** Prevents duplicate binding of fan-out listener. */
  private fanOutBound: boolean;

  /**
   * @param config Client configuration passed to underlying FCA bot.
   */
  constructor(config: ConduitClientConfig) {
    this._client = null;
    this.config = {
      ...config,
      logLevel: config.logLevel ?? "silent",
    };
    this.middlewares = new Map();
    this.fanOutBound = false;
  }

  /**
   * Message-level API for sending, replying, reacting, and editing messages.
   *
   * @remarks
   * When message queueing is enabled, all operations are executed sequentially
   * with controlled delays to reduce rate-limit risk.
   */
  get messages(): ConduitMessagesAPI {
    return (this._messages ??= new ConduitMessagesAPI(
      this.client,
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

  /** Lazy thread user cache instance. */
  private get userCache(): ConduitSlidingCache<UserInfo> {
    return (this._userCache ??= new ConduitSlidingCache(
      this.config.cache?.cacheUsers ?? ({} as ConduitCacheConfig),
    ));
  }

  /**
   * Authenticates with Messenger and initializes the FCA client.
   *
   * Must be called before using any API or event system.
   *
   * @param credentials Authentication method (appstate, cookies, or email/password)
   * @returns The same client instance for chaining
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
    return this;
  }

  /**
   * Registers middleware for a Conduit event.
   *
   * The first registration binds the underlying FCA listener.
   * Middleware executes sequentially and must call `next()`.
   *
   * @param event Event name
   * @param middlewares Ordered middleware stack
   */
  public on<K extends keyof ConduitEvents>(
    event: K,
    ...middlewares: Middleware<K>[]
  ): this {
    if (!this.middlewares.has(event)) {
      this.middlewares.set(event, []);

      if (FANOUT_EVENTS.has(event)) {
        this.bindFanOutEvents();
      } else {
        this.bindConduitEvent(event);
      }
    }

    this.middlewares
      .get(event)!
      .push(...(middlewares as Middleware<keyof ConduitEvents>[]));

    return this;
  }

  /**
   * Registers middleware on raw FCA events (bypasses Conduit layer).
   *
   * Useful for unsupported or experimental FCA events.
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
   * Raw FCA API access (no type safety).
   *
   * @returns FCA API context
   */
  public get api(): any {
    return this.client.ctx.api;
  }

  /**
   * Binds a single Conduit event to FCA listener.
   */
  private bindConduitEvent<K extends keyof ConduitEvents>(event: K) {
    const fcaEvent = toFcaEvent(event);

    this.client.on(fcaEvent, async (raw: any) => {
      const stack = this.middlewares.get(event) ?? [];
      await this.runStack(stack, this.enrich(event, raw));
    });
  }

  /**
   * Internal FCA client instance.
   *
   * @throws ConduitError if accessed before login()
   */
  private get client(): MessengerBot {
    if (this._client) return this._client;
    throw ConduitError.uninitializedClient();
  }

  /**
   * Binds threadUpdate fan-out dispatcher.
   */
  private bindFanOutEvents() {
    if (this.fanOutBound) return;
    this.fanOutBound = true;

    this.client.on("threadUpdate", async (raw: any) => {
      const { logMessageType } = raw;

      const updateStack = this.middlewares.get("thread:update") ?? [];
      if (updateStack.length > 0) {
        await this.runStack(updateStack, this.enrich("thread:update", raw));
      }

      const conduitEvent = LOG_MESSAGE_TYPE_MAP[logMessageType];
      if (!conduitEvent) return;

      const stack = this.middlewares.get(conduitEvent) ?? [];
      if (!stack.length) return;

      await this.runStack(stack, this.enrich(conduitEvent, raw));
    });
  }

  /**
   * Enriches raw FCA payload with helper methods.
   *
   * @remarks
   * - All events get `send()`
   * - Message events get `reply()` and `react()`
   * - Thread/user events get management helpers
   */
  private enrich(event: keyof ConduitEvents, raw: any): any {
    const threadID = raw.threadID;
    const messageID = raw.messageID;

    const sendable = {
      send: (body: ConduitMessageBuilder | string | ConduitMessageBody) =>
        this.messages.send(body, threadID),
    };

    if (MESSAGE_REPLYABLE.has(event)) {
      return {
        ...raw,
        ...sendable,
        reply: (body: any) => this.messages.reply(body, threadID, messageID),
        react: (emoji: string) =>
          this.messages.react(emoji, messageID, threadID),
      };
    }

    if (
      event.startsWith("thread:") ||
      event === "user:create" ||
      event === "user:remove"
    ) {
      return {
        ...raw,
        ...sendable,
        changeNickname: (nickname: string, userID: string) =>
          this.threads.changeNickname(nickname, threadID, userID),
        changeAdminStatus: (userID: string, isAdmin: boolean) =>
          this.threads.changeAdminStatus(userID, threadID, isAdmin),
      };
    }

    return { ...raw, ...sendable };
  }

  /**
   * Executes middleware stack sequentially.
   *
   * Each middleware must call `next()` to continue execution.
   */
  private async runStack(stack: Middleware<keyof ConduitEvents>[], data: any) {
    let i = 0;
    const next = async () => {
      if (i < stack.length) {
        await stack[i++](data as never, next);
      }
    };
    await next();
  }
}
