import { MessengerBot } from "@dongdev/fca-unofficial";

/**
 * Account-level API wrapper for Conduit.
 *
 * Provides methods for managing the authenticated Facebook account,
 * including session control, social graph actions, and account state changes.
 *
 * @remarks
 * This is a thin wrapper around the underlying FCA API (`bot.ctx.api`),
 * converting callback-based methods into Promise-based interfaces.
 *
 * Accessible via `client.account`.
 */
export class ConduitAccountAPI {
  constructor(private readonly bot: MessengerBot) {}

  /**
   * Retrieves the currently authenticated user's Facebook ID.
   *
   * @returns The user ID of the logged-in account
   */
  getCurrentUserID(): string {
    return this.bot.ctx.api.getCurrentUserID();
  }

  /**
   * Blocks or unblocks a user.
   *
   * @param userID - Target user to block/unblock
   * @param block - `true` to block, `false` to unblock
   *
   * @remarks
   * Blocking affects messaging and visibility between accounts.
   */
  blockUser(userID: string, block: boolean): Promise<void> {
    return new Promise((resolve, reject) => {
      this.bot.ctx.api.changeBlockedStatus(userID, block, (err: any) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Responds to a friend request.
   *
   * @param userID - ID of the user who sent the request
   * @param accept - `true` to accept, `false` to decline
   *
   * @remarks
   * Declining a request does not notify the sender directly.
   */
  handleFriendRequest(userID: string, accept: boolean): Promise<void> {
    return new Promise((resolve, reject) => {
      this.bot.ctx.api.handleFriendRequest(userID, accept, (err: any) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Removes a user from the authenticated account's friend list.
   *
   * @param userID - Target user ID
   */
  unfriend(userID: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.bot.ctx.api.unfriend(userID, (err: any) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Logs out the current session and invalidates authentication cookies.
   *
   * @remarks
   * After logout, the client instance becomes unusable until re-authenticated.
   */
  logout(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.bot.ctx.api.logout((err: any) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
