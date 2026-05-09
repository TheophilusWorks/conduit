import { MessengerBot } from "@dongdev/fca-unofficial";

/**
 * Provides thread-related API methods wrapping the underlying FCA client.
 * Accessible via `client.threads`.
 */
export class ConduitThreadsAPI {
  constructor(private readonly bot: MessengerBot) {}

  /**
   * Fetches detailed info about a thread.
   * @param threadID - The thread ID to query.
   */
  getInfo(threadID: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.bot.ctx.api.getThreadInfo(threadID, (err: any, data: any) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  }

  /**
   * Fetches a paginated list of threads.
   * @param limit - Number of threads to return.
   * @param cursor - Pagination cursor, or `null` for the first page.
   * @param folders - Folder filters e.g. `["INBOX"]`.
   */
  getList(limit: number, cursor: any, folders: string[]): Promise<any> {
    return new Promise((resolve, reject) => {
      this.bot.ctx.api.getThreadList(
        limit,
        cursor,
        folders,
        (err: any, data: any) => {
          if (err) reject(err);
          else resolve(data);
        },
      );
    });
  }

  /**
   * Fetches message history for a thread.
   * @param threadID - The thread ID to query.
   * @param limit - Number of messages to return.
   */
  getHistory(threadID: string, limit: number): Promise<any> {
    return new Promise((resolve, reject) => {
      this.bot.ctx.api.getThreadHistory(
        threadID,
        limit,
        undefined,
        (err: any, data: any) => {
          if (err) reject(err);
          else resolve(data);
        },
      );
    });
  }

  /**
   * Searches for threads by name or keyword.
   * @param query - The search query string.
   */
  search(query: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.bot.ctx.api.searchForThread(query, (err: any, data: any) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  }

  /**
   * Creates a new group conversation.
   * @param userIDs - Array of user IDs to add to the group.
   * @param name - Optional group name.
   */
  createGroup(userIDs: string[], name?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.bot.ctx.api.createNewGroup(userIDs, name, (err: any, data: any) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  }

  /**
   * Adds a user to an existing group thread.
   * @param userID - The user ID to add.
   * @param threadID - The target group thread ID.
   */
  addUser(userID: string, threadID: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.bot.ctx.api.addUserToGroup(userID, threadID, (err: any) => {
        if (err) reject(err);
        else resolve(null);
      });
    });
  }

  /**
   * Removes a user from a group thread.
   * @param userID - The user ID to remove.
   * @param threadID - The target group thread ID.
   */
  removeUser(userID: string, threadID: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.bot.ctx.api.removeUserFromGroup(userID, threadID, (err: any) => {
        if (err) reject(err);
        else resolve(null);
      });
    });
  }

  /**
   * Promotes or demotes a user's admin status in a group.
   * @param userID - The target user ID.
   * @param threadID - The group thread ID.
   * @param admin - `true` to promote, `false` to demote.
   */
  changeAdminStatus(
    userID: string,
    threadID: string,
    admin: boolean,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      this.bot.ctx.api.changeAdminStatus(
        userID,
        threadID,
        admin,
        (err: any) => {
          if (err) reject(err);
          else resolve(null);
        },
      );
    });
  }

  /**
   * Updates the group's profile image.
   * @param image - A readable stream or file buffer.
   * @param threadID - The target group thread ID.
   */
  changeGroupImage(image: any, threadID: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.bot.ctx.api.changeGroupImage(image, threadID, (err: any) => {
        if (err) reject(err);
        else resolve(null);
      });
    });
  }

  /**
   * Sets a participant's nickname in a thread.
   * @param nickname - The new nickname. Pass an empty string to clear.
   * @param threadID - The thread ID.
   * @param userID - The target user ID.
   */
  changeNickname(
    nickname: string,
    threadID: string,
    userID: string,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      this.bot.ctx.api.changeNickname(
        nickname,
        threadID,
        userID,
        (err: any) => {
          if (err) reject(err);
          else resolve(null);
        },
      );
    });
  }

  /**
   * Changes the title of a group thread.
   * @param title - The new group title.
   * @param threadID - The target group thread ID.
   */
  setTitle(title: string, threadID: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.bot.ctx.api.setTitle(title, threadID, (err: any) => {
        if (err) reject(err);
        else resolve(null);
      });
    });
  }

  /**
   * Creates a poll in a thread.
   * @param title - The poll question.
   * @param threadID - The target thread ID.
   * @param options - Array of answer options.
   */
  createPoll(title: string, threadID: string, options: string[]): Promise<any> {
    return new Promise((resolve, reject) => {
      this.bot.ctx.api.createPoll(
        title,
        threadID,
        options,
        (err: any, data: any) => {
          if (err) reject(err);
          else resolve(data);
        },
      );
    });
  }

  /**
   * Deletes a thread.
   * @param threadID - The thread ID to delete.
   */
  delete(threadID: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.bot.ctx.api.deleteThread(threadID, (err: any) => {
        if (err) reject(err);
        else resolve(null);
      });
    });
  }

  /**
   * Mutes or unmutes notifications for a thread.
   * @param threadID - The target thread ID.
   * @param muteUntil - Timestamp (ms) to mute until. Pass `-1` to mute indefinitely, `0` to unmute.
   */
  mute(threadID: string, muteUntil: number): Promise<any> {
    return new Promise((resolve, reject) => {
      this.bot.ctx.api.muteThread(threadID, muteUntil, (err: any) => {
        if (err) reject(err);
        else resolve(null);
      });
    });
  }

  /**
   * Accepts or declines a message request.
   * @param threadID - The thread ID of the request.
   * @param accept - `true` to accept, `false` to decline.
   */
  handleMessageRequest(threadID: string, accept: boolean): Promise<any> {
    return new Promise((resolve, reject) => {
      this.bot.ctx.api.handleMessageRequest(threadID, accept, (err: any) => {
        if (err) reject(err);
        else resolve(null);
      });
    });
  }
}
