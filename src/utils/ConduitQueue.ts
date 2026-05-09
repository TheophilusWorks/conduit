import { ConduitQueueConfig, ConduitQueueJob } from "../types.js";
import { sleep } from "./sleep.js";

export class ConduitQueue {
  private minDelayMs: number;
  private maxDelayMs: number;
  private switchDelayMinMs: number;
  private switchDelayMaxMs: number;
  private queues: Map<string, ConduitQueueJob<any>[]>;
  private running: Map<string, boolean>;
  private lastThreadID: string | null = null;

  constructor(options: ConduitQueueConfig) {
    this.minDelayMs = options.minDelayMs;
    this.maxDelayMs = options.maxDelayMs;
    this.switchDelayMinMs = options.switchDelayMinMs ?? 500;
    this.switchDelayMaxMs = options.switchDelayMaxMs ?? 700;
    this.queues = new Map();
    this.running = new Map();
  }

  public enqueue<T>(threadID: string, job: ConduitQueueJob<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.queues.has(threadID)) this.queues.set(threadID, []);
      this.queues.get(threadID)!.push(async () => {
        try {
          resolve(await job());
        } catch (e) {
          reject(e);
        }
      });
      if (!this.running.get(threadID)) this._run(threadID);
    });
  }

  private async _run(threadID: string) {
    this.running.set(threadID, true);
    const queue = this.queues.get(threadID)!;

    while (queue.length > 0) {
      if (this.lastThreadID !== null && this.lastThreadID !== threadID) {
        await sleep(this.switchDelayMinMs, this.switchDelayMaxMs);
      }

      this.lastThreadID = threadID;
      const job = queue.shift()!;
      await job().catch(console.error);

      if (queue.length > 0) {
        await sleep(this.minDelayMs, this.maxDelayMs);
      }
    }

    this.queues.delete(threadID);
    this.running.delete(threadID);
  }
}
