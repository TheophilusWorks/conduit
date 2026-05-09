import { MessengerBot } from "@dongdev/fca-unofficial";

/**
 * Provides account-related API methods wrapping the underlying FCA client.
 * Accessible via `client.account`.
 */
export class ConduitAccountAPI {
  constructor(private readonly bot: MessengerBot) {}

  /**
   * Returns the logged-in user's Facebook ID.
   */
  getCurrentUserID(): string {
    return this.bot.ctx.api.getCurrentUserID();
  }

  /**
   * Blocks or unblocks a user.
   * @param userID - The target user ID.
   * @param block - `true` to block, `false` to unblock.
   */
  blockUser(userID: string, block: boolean): Promise<any> {
    return new Promise((resolve, reject) => {
      this.bot.ctx.api.changeBlockedStatus(userID, block, (err: any) => {
        if (err) reject(err);
        else resolve(null);
      });
    });
  }

  /**
   * Accepts or declines a friend request.
   * @param userID - The user ID who sent the request.
   * @param accept - `true` to accept, `false` to decline.
   */
  handleFriendRequest(userID: string, accept: boolean): Promise<any> {
    return new Promise((resolve, reject) => {
      this.bot.ctx.api.handleFriendRequest(userID, accept, (err: any) => {
        if (err) reject(err);
        else resolve(null);
      });
    });
  }

  /**
   * Removes a user from the friends list.
   * @param userID - The target user ID.
   */
  unfriend(userID: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.bot.ctx.api.unfriend(userID, (err: any) => {
        if (err) reject(err);
        else resolve(null);
      });
    });
  }

  /**
   * Ends the current session and invalidates cookies.
   */
  logout(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.bot.ctx.api.logout((err: any) => {
        if (err) reject(err);
        else resolve(null);
      });
    });
  }
}
