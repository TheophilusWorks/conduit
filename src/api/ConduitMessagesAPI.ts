import { MessengerBot } from "@dongdev/fca-unofficial";
import { ConduitMessageBody } from "../types.js";

/**
 * Provides message-related API methods wrapping the underlying FCA client.
 * Accessible via `client.messages`.
 */
export class ConduitMessagesAPI {
  constructor(private readonly bot: MessengerBot) {}

  /**
   * Sends a message to a thread.
   * @param body - The message text.
   * @param threadID - The target thread ID.
   */
  send(body: string | ConduitMessageBody, threadID: string): Promise<any> {
    if (typeof body === "string") {
      return new Promise((resolve, reject) => {
        this.bot.ctx.api.sendMessage(
          { body },
          threadID,
          (err: any, data: any) => {
            if (err) reject(err);
            else resolve(data);
          },
        );
      });
    }

    return new Promise((resolve, reject) => {
      this.bot.ctx.api.sendMessage(body, threadID, (err: any, data: any) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  }

  /**
   * Sends a quoted reply to a specific message.
   * @param body - The reply text.
   * @param threadID - The target thread ID.
   * @param messageID - The message ID to reply to.
   */
  reply(
    body: string | ConduitMessageBody,
    threadID: string,
    messageID: string,
  ): Promise<any> {
    if (typeof body === "string") {
      return new Promise((resolve, reject) => {
        this.bot.ctx.api.sendMessage(
          { body },
          threadID,
          (err: any, data: any) => {
            if (err) reject(err);
            else resolve(data);
          },
          messageID,
        );
      });
    }

    return new Promise((resolve, reject) => {
      this.bot.ctx.api.sendMessage(
        body,
        threadID,
        (err: any, data: any) => {
          if (err) reject(err);
          else resolve(data);
        },
        messageID,
      );
    });
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
    return new Promise((resolve, reject) => {
      this.bot.ctx.api.setMessageReaction(
        emoji,
        messageID,
        (err: any) => {
          if (err) reject(err);
          else resolve(null);
        },
        threadID,
      );
    });
  }

  /**
   * Sends a typing indicator to a thread.
   * @param threadID - The target thread ID.
   */
  sendTypingIndicator(threadID: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.bot.ctx.api.sendTypingIndicator(threadID, (err: any) => {
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
   * Uploads a file attachment and returns an attachment object.
   * @param file - A readable stream or file buffer.
   */
  uploadAttachment(file: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.bot.ctx.api.uploadAttachment(file, (err: any, data: any) => {
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
