import { createMessengerBot, MessengerBot } from "@dongdev/fca-unofficial";
import {
  ConduitClientConfig,
  ConduitCredentials,
  ConduitEvents,
  Middleware,
} from "../types.js";
import { toFcaEvent } from "../utils/toFcaEvent.js";

export class ConduitClient {
  private client: MessengerBot | null;
  private config: ConduitClientConfig;
  private middlewares: Map<keyof ConduitEvents, Middleware<any>[]>;

  constructor(config: ConduitClientConfig) {
    this.client = null;
    this.config = config;
    this.middlewares = new Map();
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
      this.bindConduitEvent(event);
    }
    this.middlewares.get(event)!.push(...(middlewares as Middleware<any>[]));
    return this;
  }

  public onFca(
    event: string,
    ...middlewares: ((
      payload: any,
      next: () => Promise<void>,
    ) => Promise<void>)[]
  ): this {
    this.client?.on(event, async (payload: any) => {
      await this.runStack(middlewares, payload);
    });
    return this;
  }

  private bindConduitEvent<K extends keyof ConduitEvents>(event: K) {
    const fcaEvent = toFcaEvent(event);
    this.client?.on(fcaEvent, async (payload: any) => {
      const stack = this.middlewares.get(event) ?? [];
      await this.runStack(stack, payload);
    });
  }

  private async runStack(stack: Middleware<any>[], payload: any) {
    let i = 0;
    const next = async () => {
      if (i < stack.length) {
        await stack[i++](payload, next);
      }
    };
    await next();
  }
}
