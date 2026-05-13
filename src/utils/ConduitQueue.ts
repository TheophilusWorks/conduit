import { ConduitQueueConfig, ConduitQueueJob } from "../types.js";
import { sleep } from "./sleep.js";

/**
 * Internal concurrency queue system for Conduit.
 *
 * Handles:
 * - per-thread job sequencing
 * - controlled delay between messages
 * - cross-thread switching delays
 * - rate-limit smoothing
 *
 * @remarks
 * This queue ensures that operations targeting the same thread
 * are executed sequentially, while also adding randomized delays
 * to simulate natural interaction timing and reduce API abuse risk.
 */
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

  /**
   * Enqueues a job for a specific thread.
   *
   * Jobs are executed in FIFO order per thread.
   *
   * @param threadID - Target thread for execution
   * @param job - Async function representing the operation
   * @returns Promise resolving with the job result
   *
   * @remarks
   * If the queue is not currently running for the thread,
   * execution starts automatically.
   */
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

  /**
   * Internal execution loop for a thread queue.
   *
   * Processes jobs sequentially and applies delays between:
   * - consecutive jobs in the same thread
   * - switching between different threads
   */
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
