import { MessengerBot } from "@dongdev/fca-unofficial";
import { ConduitQueue } from "../utils/ConduitQueue.js";

/**
 * High-level thread management API for Conduit.
 *
 * Provides utilities for interacting with group chats, message threads,
 * participants, and thread-level metadata.
 *
 * @remarks
 * This class wraps the FCA callback-based API into Promise-based methods.
 * Certain mutating operations may be queued when a {@link ConduitQueue}
 * is provided (e.g. nickname changes, title updates, polls).
 *
 * Accessible via `client.threads`.
 */
export class ConduitThreadsAPI {
  constructor(
    private readonly bot: MessengerBot,
    private readonly queue?: ConduitQueue,
  ) {}

  /**
   * Retrieves detailed metadata about a thread.
   *
   * @param threadID - Target conversation ID
   * @returns Thread information object from FCA
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
   *
   * @param limit - Maximum number of threads to return
   * @param cursor - Pagination cursor or `null` for first page
   * @param folders - Thread folders to include (e.g. `["INBOX"]`)
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
   * Retrieves message history for a thread.
   *
   * @param threadID - Target conversation ID
   * @param limit - Number of messages to fetch
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
   * Searches for threads by keyword or name.
   *
   * @param query - Search term
   * @returns Matching thread results
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
   *
   * @param userIDs - Participants to include in the group
   * @param name - Optional group title
   * @returns Newly created thread data
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
   * Adds a user to a group thread.
   *
   * @param userID - User to add
   * @param threadID - Target group thread
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
   *
   * @param userID - User to remove
   * @param threadID - Target group thread
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
   * Changes a participant's admin status.
   *
   * @param userID - Target user
   * @param threadID - Group thread
   * @param admin - `true` to promote, `false` to demote
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
   * Updates the group profile image.
   *
   * @param image - Image stream or buffer
   * @param threadID - Target group thread
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
   *
   * @param nickname - New nickname (empty string clears it)
   * @param threadID - Target thread
   * @param userID - Target user
   *
   * @remarks
   * This operation may be queued if a ConduitQueue is configured.
   */
  changeNickname(
    nickname: string,
    threadID: string,
    userID: string,
  ): Promise<any> {
    const fn = () =>
      new Promise((resolve, reject) => {
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

    return this.queue ? this.queue.enqueue(threadID, fn) : fn();
  }

  /**
   * Updates the title of a group thread.
   *
   * @param title - New group name
   * @param threadID - Target group thread
   */
  setTitle(title: string, threadID: string): Promise<any> {
    const fn = () =>
      new Promise((resolve, reject) => {
        this.bot.ctx.api.setTitle(title, threadID, (err: any) => {
          if (err) reject(err);
          else resolve(null);
        });
      });

    return this.queue ? this.queue.enqueue(threadID, fn) : fn();
  }

  /**
   * Creates a poll in a thread.
   *
   * @param title - Poll question
   * @param threadID - Target thread
   * @param options - Answer choices
   */
  createPoll(title: string, threadID: string, options: string[]): Promise<any> {
    const fn = () =>
      new Promise((resolve, reject) => {
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

    return this.queue ? this.queue.enqueue(threadID, fn) : fn();
  }

  /**
   * Deletes a thread.
   *
   * @param threadID - Target thread
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
   * Mutes or unmutes a thread.
   *
   * @param threadID - Target thread
   * @param muteUntil - Timestamp in ms, `-1` for permanent mute, `0` to unmute
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
   * Accepts or rejects a message request thread.
   *
   * @param threadID - Request thread
   * @param accept - `true` to accept, `false` to decline
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
