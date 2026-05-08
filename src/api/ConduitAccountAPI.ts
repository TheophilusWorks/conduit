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
    return this.bot.ctx.api.changeBlockedStatus(userID, block);
  }

  /**
   * Accepts or declines a friend request.
   * @param userID - The user ID who sent the request.
   * @param accept - `true` to accept, `false` to decline.
   */
  handleFriendRequest(userID: string, accept: boolean): Promise<any> {
    return this.bot.ctx.api.handleFriendRequest(userID, accept);
  }

  /**
   * Removes a user from the friends list.
   * @param userID - The target user ID.
   */
  unfriend(userID: string): Promise<any> {
    return this.bot.ctx.api.unfriend(userID);
  }

  /**
   * Ends the current session and invalidates cookies.
   */
  logout(): Promise<any> {
    return this.bot.ctx.api.logout();
  }
}
