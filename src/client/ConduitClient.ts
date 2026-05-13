import { createMessengerBot, MessengerBot } from "@dongdev/fca-unofficial";
import {
  ConduitClientConfig,
  ConduitCredentials,
  ConduitEvents,
  ConduitMessageBody,
  ConduitQueueConfig,
  Middleware,
} from "../types.js";
import { toFcaEvent } from "../utils/toFcaEvent.js";
import { ConduitError } from "../errors/ConduitError.js";
import { ConduitMessagesAPI } from "../api/ConduitMessagesAPI.js";
import { ConduitThreadsAPI } from "../api/ConduitThreadsAPI.js";
import { ConduitUsersAPI } from "../api/ConduitUsersAPI.js";
import { ConduitAccountAPI } from "../api/ConduitAccountAPI.js";
import { ConduitQueue } from "../utils/ConduitQueue.js";
import { ConduitMessageBuilder } from "../builders/ConduitMessageBuilder.js";

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
 * High-level Messenger client that wraps the FCA unofficial API and exposes
 * a middleware-based event system modelled after Express/Koa.
 *
 * @example
 * ```ts
 * const conduit = new ConduitClient(config);
 * await conduit.login(credentials);
 * conduit.on("message:create", async (ctx, next) => {
 *   console.log(ctx.body);
 *   await next();
 * });
 * ```
 */
export class ConduitClient {
  /** Underlying FCA bot instance. `null` until {@link login} resolves. */
  private _client: MessengerBot | null;

  /** Lazily-initialized messages API wrapper. */
  private _messages: ConduitMessagesAPI | null = null;

  /** Lazily-initialized threads API wrapper. */
  private _threads: ConduitThreadsAPI | null = null;

  /** Lazily-initialized users API wrapper. */
  private _users: ConduitUsersAPI | null = null;

  /** Lazily-initialized account API wrapper. */
  private _account: ConduitAccountAPI | null = null;

  /** Lazily-initialized queue for message operations. */
  private _messageQueue: ConduitQueue | null = null;

  /** Lazily-initialized queue for thread operations. */
  private _threadQueue: ConduitQueue | null = null;

  /** Configuration forwarded to the FCA layer on login. */
  private config: ConduitClientConfig;

  /**
   * Registry of middleware stacks keyed by Conduit event name.
   * Each stack is executed in insertion order via {@link runStack}.
   */
  private middlewares: Map<
    keyof ConduitEvents,
    Middleware<keyof ConduitEvents>[]
  >;

  /**
   * Guards against registering the `threadUpdate` fan-out listener more than once,
   * regardless of how many fan-out events are subscribed to.
   */
  private fanOutBound: boolean;

  /**
   * @param config - Client configuration passed through to the FCA bot.
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
   * API for message operations.
   *
   * Provides methods for sending messages, replying to threads,
   * reacting to messages, editing content, deleting messages,
   * and other message-level interactions.
   */
  get messages(): ConduitMessagesAPI {
    return (this._messages ??= new ConduitMessagesAPI(
      this.client,
      this.config.queue?.messageQueue ? this.messageQueue : undefined,
    ));
  }

  /**
   * API for thread management operations.
   *
   * Includes functionality for retrieving thread data,
   * managing participants, updating thread metadata (such as title),
   * and handling thread-level features like polls.
   */
  get threads(): ConduitThreadsAPI {
    return (this._threads ??= new ConduitThreadsAPI(
      this.client,
      this.config.queue?.threadQueue ? this.threadQueue : undefined,
    ));
  }

  /**
   * API for user-related operations.
   *
   * Supports fetching user profiles, resolving user IDs,
   * and accessing social graph data such as friends or connections.
   */
  get users(): ConduitUsersAPI {
    return (this._users ??= new ConduitUsersAPI(this.client));
  }

  /**
   * API for account-level operations.
   *
   * Exposes actions tied to the authenticated account such as
   * retrieving the current user ID, managing friend requests,
   * blocking users, and logging out.
   */
  get account(): ConduitAccountAPI {
    return (this._account ??= new ConduitAccountAPI(this.client));
  }

  /**
   * Lazily-initialized queue for message operations.
   * Only created when `config.queue.messageQueue` is defined.
   */
  private get messageQueue(): ConduitQueue {
    return (this._messageQueue ??= new ConduitQueue(
      this.config.queue?.messageQueue ?? ({} as ConduitQueueConfig),
    ));
  }

  /**
   * Lazily-initialized queue for thread operations.
   * Only created when `config.queue.threadQueue` is defined.
   */
  private get threadQueue(): ConduitQueue {
    return (this._threadQueue ??= new ConduitQueue(
      this.config.queue?.threadQueue ?? ({} as ConduitQueueConfig),
    ));
  }

  /**
   * Authenticates with Messenger and initialises the underlying FCA bot.
   * Must be called before any events can be received.
   *
   * @param credentials - App-state, cookies, or email/password credentials.
   * @returns The current instance for chaining.
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
   * Registers one or more middleware handlers for a Conduit event.
   *
   * The first call for a given event also binds the corresponding FCA listener.
   * Fan-out events share a single `threadUpdate` FCA binding; all others get
   * their own dedicated listener via {@link bindConduitEvent}.
   *
   * @param event - The Conduit event name to subscribe to.
   * @param middlewares - Ordered middleware functions to push onto the stack.
   * @returns The current instance for chaining.
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
   * Registers middleware directly against a raw FCA event, bypassing the
   * Conduit event abstraction entirely. Useful for events not yet mapped
   * by the Conduit layer.
   *
   * @param event - Raw FCA event name.
   * @param middlewares - Middleware functions receiving the raw FCA payload.
   * @returns The current instance for chaining.
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
   * Direct access to the raw FCA API. No type safety — use as a last resort.
   *
   * @returns The raw FCA API context.
   */
  public get api(): any {
    return this.client.ctx.api;
  }

  /**
   * Translates a single Conduit event to its FCA equivalent and attaches a
   * listener that enriches the raw payload before running the middleware stack.
   *
   * @param event - The Conduit event to bind.
   */
  private bindConduitEvent<K extends keyof ConduitEvents>(event: K) {
    const fcaEvent = toFcaEvent(event);
    this.client.on(fcaEvent, async (raw: any) => {
      const stack = this.middlewares.get(event) ?? [];
      await this.runStack(stack, this.enrich(event, raw));
    });
  }

  /**
   * Returns the initialized Messenger client instance.
   *
   * This getter enforces the client lifecycle by ensuring that the underlying
   * FCA bot has been created via {@link login} before any access is allowed.
   *
   * @throws {ConduitError} If the client has not been initialized yet.
   * @returns {MessengerBot} The active Messenger bot instance.
   */
  private get client(): MessengerBot {
    if (this._client) return this._client;
    throw ConduitError.uninitializedClient();
  }

  /**
   * Attaches a single `threadUpdate` FCA listener that fans out to all
   * relevant Conduit events based on the incoming `logMessageType`.
   *
   * `thread:update` always fires with the raw payload when its stack is
   * non-empty. Specific sub-events fire only when their stack is also
   * non-empty and a matching `logMessageType` exists.
   *
   * Calling this method more than once is a no-op.
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
      if (stack.length === 0) return;

      await this.runStack(stack, this.enrich(conduitEvent, raw));
    });
  }

  /**
   * Augments a raw FCA payload with convenience helpers scoped to the event.
   *
   * All events receive a `send` helper for replying to the source thread.
   * Events in the `message:` namespace additionally receive:
   * - `reply` — sends a quoted reply to the triggering message.
   * - `react` — sets an emoji reaction on the triggering message.
   *
   * @param event - The Conduit event being enriched.
   * @param raw - The raw FCA payload.
   * @returns The enriched context object passed to middleware.
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
        reply: (body: ConduitMessageBuilder | string | ConduitMessageBody) =>
          this.messages.reply(body, threadID, messageID),
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
   * Executes a middleware stack sequentially, where each handler must call
   * `next()` to advance to the following handler.
   *
   * @param stack - Ordered array of middleware functions to execute.
   * @param data - The enriched event payload threaded through the stack.
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
