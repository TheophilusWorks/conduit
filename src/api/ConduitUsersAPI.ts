import { MessengerBot } from "@dongdev/fca-unofficial";
import { ConduitCacheConfig, UserInfo, UserInfoResponse } from "../types.js";
import { ConduitSlidingCache } from "../utils/ConduitSlidingCache.js";

/**
 * High-level API for interacting with Messenger user data.
 *
 * Exposed as `client.users`, this wrapper provides access to profile lookup,
 * identity resolution, and social graph retrieval.
 *
 * All methods are thin wrappers around the underlying FCA API and return
 * raw responses unless otherwise specified.
 */
export class ConduitUsersAPI {
  constructor(
    private readonly bot: MessengerBot,
    private readonly config: ConduitCacheConfig | undefined,
    private userCache: ConduitSlidingCache<UserInfo>,
  ) {}

  /**
   * Retrieves profile information for one or more users.
   *
   * This is the primary method for resolving user metadata such as:
   * display name, profile picture, vanity URL, and basic account info.
   *
   * @param userID - A single user ID or an array of user IDs.
   *
   * @returns A map of user IDs to their corresponding profile data.
   */
  async getInfo(userID: string | string[]): Promise<UserInfoResponse> {
    const ids = Array.isArray(userID) ? userID : [userID];

    if (!this.config?.ttlInMS) {
      return this._fetchInfo(ids);
    }

    const result: UserInfoResponse = {};

    await Promise.all(
      ids.map(async (id) => {
        result[id] = await this.userCache.touch(id, async () => {
          const fetched = await this._fetchInfo([id]);
          return fetched[id];
        });
      }),
    );

    return result;
  }

  /**
   * Resolves a vanity username or profile URL slug into a numeric user ID.
   *
   * Useful when dealing with public profile links or custom usernames
   * instead of raw Facebook IDs.
   *
   * @param vanity - Username, vanity slug, or profile URL identifier.
   *
   * @returns A resolved Facebook user ID or resolution metadata.
   */
  getID(vanity: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.bot.ctx.api.getUserID(vanity, (err: any, data: any) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  }

  /**
   * Retrieves the authenticated account's friends list.
   *
   * The returned data typically includes user IDs and minimal profile
   * information for each friend connection.
   *
   * @returns Array of friend objects associated with the logged-in account.
   */
  getFriendsList(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.bot.ctx.api.getFriendsList((err: any, data: any) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  }

  private _fetchInfo(ids: string[]): Promise<UserInfoResponse> {
    return new Promise((resolve, reject) => {
      this.bot.ctx.api.getUserInfo(ids, (err: any, data: any) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  }

  private _fetchID(vanity: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.bot.ctx.api.getUserID(vanity, (err: any, data: any) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  }
}
