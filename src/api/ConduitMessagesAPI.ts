import { MessengerBot } from "@dongdev/fca-unofficial";
import { ConduitMessageBody } from "../types.js";
import { ConduitQueue } from "../utils/ConduitQueue.js";
import { sleep } from "../utils/sleep.js";
import { ConduitMessageBuilder } from "../builders/ConduitMessageBuilder.js";
import { ConduitAttachmentBuilder } from "../builders/ConduitAttachmentBuilder.js";

/**
 * Provides message-related API methods wrapping the underlying FCA client.
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
   * If a queue is configured, the message is enqueued and sent after a typing
   * indicator. Otherwise it is sent immediately.
   *
   * @param body - The message text, a {@link ConduitMessageBody} for rich messages,
   * or a {@link MessageBuilder} instance which will be built before sending.
   * @param threadID - The target thread ID.
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
   * Sends a quoted reply to a specific message.
   *
   * If a queue is configured, the reply is enqueued and sent after a typing
   * indicator. Otherwise it is sent immediately.
   *
   * @param body - The reply text, a {@link ConduitMessageBody} for rich messages,
   * or a {@link MessageBuilder} instance which will be built before sending.
   * @param threadID - The target thread ID.
   * @param messageID - The message ID to reply to.
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
   * Edits an existing message.
   * @param messageID - The message ID to edit.
   * @param body - The new message text.
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
   * Unsends (retracts) a message sent by the bot.
   * @param messageID - The message ID to unsend.
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
   * @param messageID - The message ID to delete.
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
   * Adds or removes a reaction on a message.
   * @param emoji - The emoji reaction string.
   * @param messageID - The target message ID.
   * @param threadID - The thread the message belongs to.
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
   * @param threadID - The target thread ID.
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
   * @param messageID - The message ID to mark as read.
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
   * Uploads a file attachment and returns the uploaded attachment object.
   * @param file - A readable stream, file buffer, or a {@link ConduitAttachmentBuilder} instance.
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
   * @param attachmentID - The attachment ID to forward.
   * @param threadID - The target thread ID.
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
   * @param userID - The user ID of the contact to share.
   * @param threadID - The target thread ID.
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
   * Changes the color theme of a thread.
   * @param color - The color hex string.
   * @param threadID - The target thread ID.
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
   * Changes the quick-reaction emoji of a thread.
   * @param emoji - The emoji string.
   * @param threadID - The target thread ID.
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
   * Fetches a specific message by ID.
   * @param messageID - The message ID to fetch.
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
   * Returns all available thread color themes.
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
