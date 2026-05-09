import { MessengerBot } from "@dongdev/fca-unofficial";

/**
 * Provides user-related API methods wrapping the underlying FCA client.
 * Accessible via `client.users`.
 */
export class ConduitUsersAPI {
  constructor(private readonly bot: MessengerBot) {}

  /**
   * Fetches info for one or more users by ID.
   * @param userID - A single user ID or an array of user IDs.
   */
  getInfo(userID: string | string[]): Promise<any> {
    return new Promise((resolve, reject) => {
      this.bot.ctx.api.getUserInfo(
        Array.isArray(userID) ? userID : [userID],
        (err: any, data: any) => {
          if (err) reject(err);
          else resolve(data);
        },
      );
    });
  }

  /**
   * Resolves a vanity URL or username to a Facebook user ID.
   * @param vanity - The vanity name or profile URL slug.
   */
  getID(vanity: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.bot.ctx.api.getUserID(vanity, (err: any, data: any) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  }

  /**
   * Returns the authenticated user's friends list.
   */
  getFriendsList(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.bot.ctx.api.getFriendsList((err: any, data: any) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  }
}
