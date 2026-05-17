import { MessengerBot } from "@dongdev/fca-unofficial";
import { EventEmitter } from "events";
import {
  CollectorOptions,
  CollectorPayload,
  ConduitEvents,
  ConduitMessageBody,
  SentMessage,
} from "../types.js";
import { ConduitQueue } from "../utils/ConduitQueue.js";
import { sleep } from "../utils/sleep.js";
import { ConduitMessageBuilder } from "../builders/ConduitMessageBuilder.js";
import { ConduitAttachmentBuilder } from "../builders/ConduitAttachmentBuilder.js";
import { ConduitMessageCollector } from "../utils/ConduitMessageCollector.js";

/**
 * High-level messaging API for Conduit.
 *
 * Provides message sending, editing, reactions, attachments,
 * and thread interaction utilities.
 *
 * @remarks
 * All methods wrap the underlying FCA callback API and expose
 * Promise-based interfaces.
 *
 * If a {@link ConduitQueue} is provided, outgoing operations are
 * rate-limited and executed sequentially with simulated typing delays.
 *
 * Accessible via `client.messages`.
 */
export class ConduitMessagesAPI {
  constructor(
    private readonly bot: MessengerBot,
    private readonly eventBus: EventEmitter,
    private readonly queue?: ConduitQueue,
  ) {}

  // ─── Internals ─────────────────────────────────────────────────────────────

  /**
   * Wraps raw FCA sent message data into a {@link SentMessage} with
   * `collect()` and `waitResponse()` scoped to the sent message ID.
   */
  private toSentMessage(data: any, threadID: string): SentMessage {
    return new SentMessageImpl(data.messageID, threadID, this.eventBus);
  }

  // ─── Sending ───────────────────────────────────────────────────────────────

  /**
   * Sends a message to a thread.
   *
   * @param body - Message content (text, structured body, or builder)
   * @param threadID - Target conversation ID
   *
   * @remarks
   * If a queue is enabled, the message is delayed and sent after a
   * simulated typing indicator for a more natural behavior.
   *
   * @returns A {@link SentMessage} with `collect()` and `waitResponse()` scoped to this message.
   */
  send(
    body: ConduitMessageBuilder | string | ConduitMessageBody,
    threadID: string,
  ): Promise<SentMessage> {
    const resolved =
      body instanceof ConduitMessageBuilder
        ? body.build()
        : typeof body === "string"
          ? { body }
          : body;

    const fn = () =>
      new Promise<SentMessage>((resolve, reject) => {
        this.bot.ctx.api.sendTypingIndicator(threadID);
        setTimeout(() => {
          this.bot.ctx.api.sendMessage(
            resolved,
            threadID,
            (err: any, data: any) => {
              if (err) reject(err);
              else resolve(this.toSentMessage(data, threadID));
            },
          );
        }, 700);
      });

    return this.queue ? this.queue.enqueue(threadID, fn) : fn();
  }

  /**
   * Sends a reply to a specific message.
   *
   * @param body - Reply content
   * @param threadID - Conversation ID
   * @param messageID - Message being replied to
   *
   * @remarks
   * Behaves like {@link send} but attaches a reply reference to the message.
   *
   * @returns A {@link SentMessage} with `collect()` and `waitResponse()` scoped to this message.
   */
  reply(
    body: string | ConduitMessageBody | ConduitMessageBuilder,
    threadID: string,
    messageID: string,
  ): Promise<SentMessage> {
    const resolved =
      body instanceof ConduitMessageBuilder
        ? body.build()
        : typeof body === "string"
          ? { body }
          : body;

    const fn = () =>
      new Promise<SentMessage>((resolve, reject) => {
        this.bot.ctx.api.sendTypingIndicator(threadID);
        setTimeout(() => {
          this.bot.ctx.api.sendMessage(
            resolved,
            threadID,
            (err: any, data: any) => {
              if (err) reject(err);
              else resolve(this.toSentMessage(data, threadID));
            },
            messageID,
          );
        }, 700);
      });

    return this.queue ? this.queue.enqueue(threadID, fn) : fn();
  }

  // ─── Rest unchanged ────────────────────────────────────────────────────────

  /**
   * Edits an existing message sent by the bot.
   *
   * @param messageID - Target message
   * @param body - New message text
   */
  edit(messageID: string, body: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.bot.ctx.api.editMessage(body, messageID, (err: any, data: any) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  }

  /**
   * Removes a message sent by the bot.
   *
   * @param messageID - Message to unsend
   *
   * @remarks
   * This only works on messages created by the authenticated account.
   */
  unsend(messageID: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.bot.ctx.api.unsendMessage(messageID, (err: any) => {
        if (err) reject(err);
        else resolve(null);
      });
    });
  }

  /**
   * Deletes a message.
   *
   * @param messageID - Message to delete
   */
  delete(messageID: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.bot.ctx.api.deleteMessage(messageID, (err: any) => {
        if (err) reject(err);
        else resolve(null);
      });
    });
  }

  /**
   * Adds or removes a reaction to a message.
   *
   * @param emoji - Reaction emoji
   * @param messageID - Target message
   * @param threadID - Conversation ID
   *
   * @remarks
   * Includes a small randomized delay to mimic natural interaction timing.
   */
  react(emoji: string, messageID: string, threadID: string): Promise<any> {
    return new Promise(async (resolve, reject) => {
      await sleep(500, 700);
      this.bot.ctx.api.setMessageReaction(
        emoji,
        messageID,
        threadID,
        (err: any) => {
          if (err) reject(err);
          else resolve(null);
        },
      );
    });
  }

  /**
   * Sends a typing indicator to a thread.
   *
   * @param threadID - Target conversation
   */
  sendTypingIndicator(threadID: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.bot.ctx.api.sendTypingIndicator(threadID, async (err: any) => {
        if (err) reject(err);
        else resolve(null);
      });
    });
  }

  /**
   * Marks a message as read.
   *
   * @param messageID - Message to mark
   */
  markAsRead(messageID: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.bot.ctx.api.markAsRead(messageID, (err: any) => {
        if (err) reject(err);
        else resolve(null);
      });
    });
  }

  /**
   * Uploads an attachment and returns the uploaded reference.
   *
   * @param file - Stream, buffer, or attachment builder
   */
  uploadAttachment(file: any | ConduitAttachmentBuilder): Promise<any> {
    const resolved =
      file instanceof ConduitAttachmentBuilder ? file.build() : file;

    return new Promise((resolve, reject) => {
      this.bot.ctx.api.uploadAttachment(resolved, (err: any, data: any) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  }

  /**
   * Forwards an existing attachment to another thread.
   *
   * @param attachmentID - Attachment identifier
   * @param threadID - Destination thread
   */
  forwardAttachment(attachmentID: string, threadID: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.bot.ctx.api.forwardAttachment(attachmentID, threadID, (err: any) => {
        if (err) reject(err);
        else resolve(null);
      });
    });
  }

  /**
   * Shares a contact card to a thread.
   *
   * @param userID - Contact user ID
   * @param threadID - Target conversation
   */
  shareContact(userID: string, threadID: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.bot.ctx.api.shareContact(userID, threadID, (err: any, data: any) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  }

  /**
   * Changes the theme color of a thread.
   *
   * @param color - Hex color string
   * @param threadID - Target conversation
   */
  changeThreadColor(color: string, threadID: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.bot.ctx.api.changeThreadColor(color, threadID, (err: any) => {
        if (err) reject(err);
        else resolve(null);
      });
    });
  }

  /**
   * Changes the quick reaction emoji for a thread.
   *
   * @param emoji - Emoji string
   * @param threadID - Target conversation
   */
  changeThreadEmoji(emoji: string, threadID: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.bot.ctx.api.changeThreadEmoji(emoji, threadID, (err: any) => {
        if (err) reject(err);
        else resolve(null);
      });
    });
  }

  /**
   * Retrieves a message by ID.
   *
   * @param messageID - Target message
   */
  getMessage(messageID: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.bot.ctx.api.getMessage(messageID, (err: any, data: any) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  }

  /**
   * Retrieves available thread color themes.
   *
   * @returns List of supported thread colors
   */
  getThreadColors(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.bot.ctx.api.getThreadColors((err: any, data: any) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  }
}

/**
 * Concrete implementation of {@link SentMessage}.
 *
 * Wraps a sent message's identity and provides scoped collector and
 * reply-waiting helpers backed by the internal Conduit event bus.
 *
 * Constructed automatically by {@link ConduitMessagesAPI.send} and
 * {@link ConduitMessagesAPI.reply} — never instantiated directly.
 */
class SentMessageImpl implements SentMessage {
  /**
   * @param messageID - The ID of the sent message.
   * @param threadID  - The thread the message was sent to.
   * @param eventBus  - The internal Conduit event bus to subscribe collectors to.
   */
  constructor(
    public readonly messageID: string,
    public readonly threadID: string,
    private readonly eventBus: EventEmitter,
  ) {}

  /**
   * Creates a {@link ConduitMessageCollector} that listens for incoming events
   * on the internal event bus.
   *
   * **Default overload** — subscribes to `"message:respond"` only.
   * The `filter` callback and `collect` event payload are typed as `MessageRespondPayload`.
   *
   * @param options - Collector configuration.
   *
   * @example
   * ```ts
   * const collector = sent.collect({ timeout: 30_000, max: 5 });
   *
   * collector.on("collect", async (msg) => {
   *   await msg.reply(`you said: ${msg.body}`);
   * });
   * ```
   */
  collect(
    options?: CollectorOptions<["message:respond"]>,
  ): ConduitMessageCollector<["message:respond"]>;

  /**
   * Creates a {@link ConduitMessageCollector} that listens for incoming events
   * on the internal event bus.
   *
   * **Custom events overload** — subscribes to all events in the provided array.
   * The `filter` callback and `collect` event payload are typed as a union of
   * all listed event payloads, derived automatically from the events array.
   *
   * @param events  - Tuple of Conduit event names to subscribe to.
   * @param options - Collector configuration.
   *
   * @example
   * ```ts
   * const collector = sent.collect(["message:respond", "message:react"], {
   *   timeout: 30_000,
   *   filter: (e) => {
   *     if (e.type === "message:react") return e.reactorID === senderID;
   *     return e.senderID === senderID;
   *   },
   * });
   *
   * collector.on("collect", async (event) => {
   *   if (event.type === "message:react") {
   *     await ctx.reply(`you reacted: ${event.reaction}`);
   *   } else {
   *     await ctx.reply(`you said: ${event.body}`);
   *   }
   * });
   * ```
   */
  collect<K extends readonly (keyof ConduitEvents)[]>(
    events: K,
    options?: CollectorOptions<K>,
  ): ConduitMessageCollector<K>;

  collect(eventsOrOptions: any, options?: any): any {
    if (Array.isArray(eventsOrOptions)) {
      return new ConduitMessageCollector(this.eventBus, {
        ...options,
        events: eventsOrOptions,
      });
    }
    return new ConduitMessageCollector(this.eventBus, eventsOrOptions);
  }

  /**
   * Waits for a single matching event and resolves with it.
   * Rejects with an error if the timeout expires before any event arrives.
   *
   * Internally creates a {@link ConduitMessageCollector} with `max: 1`,
   * resolves on the first collected event, and stops the collector
   * with reason `"fulfilled"`.
   *
   * **Default overload** — waits for `"message:respond"` only.
   * Resolves with `MessageRespondPayload`.
   *
   * @param options - Collector options minus `max`, which is forced to `1`.
   *
   * @example
   * ```ts
   * try {
   *   const reply = await sent.waitResponse({ timeout: 15_000 });
   *   await ctx.reply(`you said: ${reply.body}`);
   * } catch {
   *   await ctx.reply("you took too long!");
   * }
   * ```
   */
  waitResponse(
    options?: Omit<CollectorOptions<["message:respond"]>, "max">,
  ): Promise<CollectorPayload<["message:respond"]>>;

  /**
   * Waits for a single matching event and resolves with it.
   * Rejects with an error if the timeout expires before any event arrives.
   *
   * Internally creates a {@link ConduitMessageCollector} with `max: 1`,
   * resolves on the first collected event, and stops the collector
   * with reason `"fulfilled"`.
   *
   * **Custom events overload** — waits for any event in the provided array.
   * Resolves with the union of all listed event payloads.
   *
   * @param events  - Tuple of Conduit event names to subscribe to.
   * @param options - Collector options minus `max`, which is forced to `1`.
   *
   * @example
   * ```ts
   * try {
   *   const response = await sent.waitResponse(
   *     ["message:respond", "message:react"],
   *     { timeout: 15_000 },
   *   );
   *
   *   if (response.type === "message:react") {
   *     await ctx.reply(`you reacted: ${response.reaction}`);
   *   } else {
   *     await ctx.reply(`you replied: ${response.body}`);
   *   }
   * } catch {
   *   await ctx.reply("no response!");
   * }
   * ```
   */
  waitResponse<K extends readonly (keyof ConduitEvents)[]>(
    events: K,
    options?: Omit<CollectorOptions<K>, "max">,
  ): Promise<CollectorPayload<K>>;

  waitResponse(eventsOrOptions: any, options?: any): Promise<any> {
    const resolved = Array.isArray(eventsOrOptions)
      ? { ...options, events: eventsOrOptions, max: 1 }
      : { ...eventsOrOptions, max: 1 };

    return new Promise((resolve, reject) => {
      const collector = new ConduitMessageCollector(this.eventBus, resolved);

      collector.once("collect", (msg) => {
        collector.stop("fulfilled");
        resolve(msg);
      });

      collector.once("end", (_, reason) => {
        if (reason === "timeout") reject(new Error("waitResponse timed out"));
      });
    });
  }
}
