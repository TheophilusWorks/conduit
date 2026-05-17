import { EventEmitter } from "events";
import type {
  CollectorEndReason,
  CollectedMessages,
  ConduitEvents,
  MessageCollectorEvents,
  MessageCollector as IMessageCollector,
  CollectorPayload,
  CollectorOptions,
} from "../types.js";

const DEFAULT_COLLECTOR_EVENTS = ["message:respond"] as const;

/**
 * Collects messages emitted from a conduit event source over a bounded window.
 *
 * Listens to one or more {@link ConduitEvents} on the provided `source` emitter,
 * applies an optional filter predicate, and accumulates matching messages into
 * {@link collected} until one of three end conditions is met:
 * - **limit** – the number of collected messages reaches `max`.
 * - **timeout** – the configured `timeout` duration elapses.
 * - **manual** – {@link stop} is called explicitly.
 *
 * When the collector ends it emits an `"end"` event with the collected map and
 * the {@link CollectorEndReason} that triggered the shutdown, then detaches all
 * listeners from `source`.
 *
 * @typeParam K - Tuple of {@link ConduitEvents} keys this collector watches.
 *   Defaults to `["message:respond"]`.
 * @typeParam T - The union payload type derived from `K` via {@link CollectorPayload}.
 *   Defaults to `CollectorPayload<K>`.
 *
 * @example
 * ```ts
 * const collector = new ConduitMessageCollector(conduit, {
 *   timeout: 30_000,
 *   max: 1,
 *   filter: (msg) => msg.senderID === targetID,
 * });
 *
 * collector.on("collect", (msg) => console.log("got", msg));
 * collector.on("end", (collected, reason) => console.log("ended:", reason));
 * ```
 */
export class ConduitMessageCollector<
    K extends readonly (keyof ConduitEvents)[] = ["message:respond"],
    T extends CollectorPayload<K> = CollectorPayload<K>,
  >
  extends EventEmitter
  implements IMessageCollector<T>
{
  /**
   * All messages that passed the filter, keyed by their `messageID`.
   * Populated incrementally as matching messages arrive.
   */
  readonly collected: CollectedMessages<T> = new Map();

  private _ended = false;
  private _source: EventEmitter;
  private _watchedEvents: readonly (keyof ConduitEvents)[];
  private _timer: ReturnType<typeof setTimeout>;
  private _handler: (message: T) => Promise<void>;

  /**
   * Whether this collector has stopped accepting new messages.
   * `true` after {@link stop} has been called for any reason.
   */
  get ended(): boolean {
    return this._ended;
  }

  /**
   * The number of messages currently in {@link collected}.
   */
  get count(): number {
    return this.collected.size;
  }

  /**
   * Creates a new `ConduitMessageCollector` and immediately begins listening.
   *
   * @param source - The event emitter to attach listeners to (typically the
   *   platform conduit or adapter instance).
   * @param options - Collector configuration.
   * @param options.filter - Optional async predicate; only messages for which
   *   this resolves to `true` are collected.
   * @param options.max - Maximum number of messages to collect before the
   *   collector stops automatically with reason `"limit"`.
   * @param options.timeout - Milliseconds after which the collector stops
   *   automatically with reason `"timeout"`.
   * @param options.events - Conduit event names to watch. Defaults to
   *   `["message:respond"]`.
   */
  constructor(
    source: EventEmitter,
    options: CollectorOptions<K> & {
      events?: readonly (keyof ConduitEvents)[];
    },
  ) {
    super();

    const {
      filter,
      max,
      timeout = Infinity,
      events = DEFAULT_COLLECTOR_EVENTS,
    } = options;

    this._source = source;
    this._watchedEvents = events;

    this._handler = async (message: T) => {
      if (this._ended) return;

      const passed = filter
        ? await filter(message as CollectorPayload<K>)
        : true;
      if (!passed) return;

      this.collected.set((message as any).messageID, message);
      this.emit("collect", message);

      if (max && this.collected.size >= max) {
        this.stop("limit");
      }
    };

    for (const event of this._watchedEvents) {
      this._source.on(event, this._handler);
    }

    this._timer = setTimeout(() => this.stop("timeout"), timeout);
  }

  /**
   * Stops the collector, detaches all source listeners, clears the timeout,
   * and emits `"end"` with the final collected map and the stop reason.
   *
   * No-ops if the collector has already ended.
   *
   * @param reason - Why the collector is being stopped. Defaults to `"manual"`.
   */
  stop(reason: CollectorEndReason = "manual"): void {
    if (this._ended) return;

    this._ended = true;
    clearTimeout(this._timer);

    for (const event of this._watchedEvents) {
      this._source.off(event, this._handler);
    }

    this.emit("end", this.collected as ReadonlyMap<string, T>, reason);
  }

  /**
   * Registers a persistent listener for a {@link MessageCollectorEvents} event.
   *
   * @param event - The collector event to listen for (`"collect"` or `"end"`).
   * @param listener - Callback invoked each time the event fires.
   */
  on<E extends keyof MessageCollectorEvents<T>>(
    event: E,
    listener: MessageCollectorEvents<T>[E],
  ): this {
    return super.on(event, listener);
  }

  /**
   * Registers a one-time listener for a {@link MessageCollectorEvents} event.
   * The listener is removed automatically after its first invocation.
   *
   * @param event - The collector event to listen for (`"collect"` or `"end"`).
   * @param listener - Callback invoked once when the event fires.
   */
  once<E extends keyof MessageCollectorEvents<T>>(
    event: E,
    listener: MessageCollectorEvents<T>[E],
  ): this {
    return super.once(event, listener);
  }

  /**
   * Removes a previously registered listener for a {@link MessageCollectorEvents} event.
   *
   * @param event - The collector event the listener was registered on.
   * @param listener - The exact listener reference to remove.
   */
  off<E extends keyof MessageCollectorEvents<T>>(
    event: E,
    listener: MessageCollectorEvents<T>[E],
  ): this {
    return super.off(event, listener);
  }
}
