import { MessengerBot } from "@dongdev/fca-unofficial";
import { ConduitMessageBody } from "../types.js";
import { ConduitQueue } from "../utils/ConduitQueue.js";
import { sleep } from "../utils/sleep.js";
import { ConduitMessageBuilder } from "../builders/ConduitMessageBuilder.js";
import { ConduitAttachmentBuilder } from "../builders/ConduitAttachmentBuilder.js";

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
    private readonly queue?: ConduitQueue,
  ) {}

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
   * @returns The sent message metadata from FCA
   */
  send(
    body: ConduitMessageBuilder | string | ConduitMessageBody,
    threadID: string,
  ): Promise<any> {
    const resolved =
      body instanceof ConduitMessageBuilder
        ? body.build()
        : typeof body === "string"
          ? { body }
          : body;

    const fn = () =>
      new Promise((resolve, reject) => {
        this.bot.ctx.api.sendTypingIndicator(threadID);
        setTimeout(() => {
          this.bot.ctx.api.sendMessage(
            resolved,
            threadID,
            (err: any, data: any) => {
              if (err) reject(err);
              else resolve(data);
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
   */
  reply(
    body: string | ConduitMessageBody | ConduitMessageBuilder,
    threadID: string,
    messageID: string,
  ): Promise<any> {
    const resolved =
      body instanceof ConduitMessageBuilder
        ? body.build()
        : typeof body === "string"
          ? { body }
          : body;

    const fn = () =>
      new Promise((resolve, reject) => {
        this.bot.ctx.api.sendTypingIndicator(threadID);
        setTimeout(() => {
          this.bot.ctx.api.sendMessage(
            resolved,
            threadID,
            (err: any, data: any) => {
              if (err) reject(err);
              else resolve(data);
            },
            messageID,
          );
        }, 700);
      });

    return this.queue ? this.queue.enqueue(threadID, fn) : fn();
  }

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
