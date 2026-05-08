import { createMessengerBot, MessengerBot } from "@dongdev/fca-unofficial";
import {
  ConduitClientConfig,
  ConduitCredentials,
  ConduitEvents,
  Middleware,
} from "../types.js";
import { toFcaEvent } from "../utils/toFcaEvent.js";

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

const LOG_MESSAGE_TYPE_MAP: Record<string, keyof ConduitEvents> = {
  "log:subscribe": "user:create",
  "log:unsubscribe": "user:remove",
  "log:thread-name": "thread:title_change",
  "log:thread-image": "thread:photo_replaced",
  "log:thread-color": "thread:theme_changed",
  "log:user-nickname": "thread:nickname_changed",
  "log:thread-admins": "thread:admin_changed",
};

export class ConduitClient {
  private client: MessengerBot | null;
  private config: ConduitClientConfig;
  private middlewares: Map<
    keyof ConduitEvents,
    Middleware<keyof ConduitEvents>[]
  >;
  private fanOutBound: boolean;

  constructor(config: ConduitClientConfig) {
    this.client = null;
    this.config = config;
    this.middlewares = new Map();
    this.fanOutBound = false;
  }

  public async login(credentials: ConduitCredentials): Promise<this> {
    this.client = await createMessengerBot(
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

  public onFca(
    event: string,
    ...middlewares: ((data: any, next: () => Promise<void>) => Promise<void>)[]
  ): this {
    this.client?.on(event, async (data: any) => {
      await this.runStack(
        middlewares as Middleware<keyof ConduitEvents>[],
        data,
      );
    });
    return this;
  }

  private bindConduitEvent<K extends keyof ConduitEvents>(event: K) {
    const fcaEvent = toFcaEvent(event);
    this.client?.on(fcaEvent, async (raw: any) => {
      const stack = this.middlewares.get(event) ?? [];
      await this.runStack(stack, this.enrich(event, raw));
    });
  }

  private bindFanOutEvents() {
    if (this.fanOutBound) return;
    this.fanOutBound = true;

    this.client?.on("threadUpdate", async (raw: any) => {
      const { logMessageType } = raw;

      // always dispatch thread:update with raw payload
      const updateStack = this.middlewares.get("thread:update") ?? [];
      if (updateStack.length > 0) {
        await this.runStack(updateStack, this.enrich("thread:update", raw));
      }

      // fan-out to specific event
      const conduitEvent = LOG_MESSAGE_TYPE_MAP[logMessageType];
      if (!conduitEvent) return;

      const stack = this.middlewares.get(conduitEvent) ?? [];
      if (stack.length === 0) return;

      await this.runStack(stack, this.enrich(conduitEvent, raw));
    });
  }

  private enrich(event: keyof ConduitEvents, raw: any): any {
    const threadID = raw.threadID;
    const messageID = raw.messageID;

    const sendable = {
      send: (body: string) =>
        this.client!.ctx.api.sendMessage({ body }, threadID),
    };

    if (event.startsWith("message:")) {
      return {
        ...raw,
        ...sendable,
        reply: (body: string) =>
          this.client!.ctx.api.sendMessage(
            { body },
            threadID,
            undefined,
            messageID,
          ),
        react: (emoji: string) =>
          this.client!.ctx.api.setMessageReaction(emoji, messageID, threadID),
      };
    }

    return { ...raw, ...sendable };
  }

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
