# conduit — API Reference

Full reference for all namespaced APIs exposed by `ConduitClient`.

## Table of Contents

- [ConduitClient](#conduitclient)
- [client.messages](#clientmessages)
- [client.threads](#clientthreads)
- [client.users](#clientusers)
- [client.account](#clientaccount)
- [Types](#types)

---

## ConduitClient

```ts
import { ConduitClient } from "conduit";

const conduit = new ConduitClient(config);
await conduit.login(credentials);
```

### Constructor

```ts
new ConduitClient(config: ConduitClientConfig)
```

`ConduitClientConfig` extends `MessengerBotOptions` from `@dongdev/fca-unofficial`. The `logLevel` defaults to `"silent"` if not provided.

---

### `.login(credentials)`

Authenticates with Messenger and initialises the underlying FCA bot. Must be called before any events can be received.

```ts
await conduit.login(credentials: ConduitCredentials): Promise<ConduitClient>
```

Returns the client instance for chaining.

---

### `.on(event, ...middlewares)`

Registers one or more middleware handlers for a Conduit event. The first call for a given event also binds the corresponding FCA listener internally.

```ts
conduit.on(event: keyof ConduitEvents, ...middlewares: Middleware[]): this
```

```ts
conduit.on("message:create", async (ctx, next) => {
  await ctx.reply("hello!");
  await next();
});
```

---

### `.onFca(event, ...middlewares)`

Registers middleware directly against a raw FCA event, bypassing the Conduit abstraction. Useful for events not yet mapped by conduit.

```ts
conduit.onFca(event: string, ...middlewares): this
```

---

### `.api`

Direct access to the raw FCA api context. No type safety or autocompletion — use as a last resort.

```ts
conduit.api.getThreadList(10, null, ["INBOX"]);
```

---

## client.messages

Accessible via `conduit.messages`. Handles all message-level operations.

---

### `.send(body, threadID)`

Sends a plain text message to a thread.

```ts
await conduit.messages.send("hello", threadID);
```

---

### `.reply(body, threadID, messageID)`

Sends a quoted reply to a specific message.

```ts
await conduit.messages.reply("got it", threadID, messageID);
```

---

### `.edit(messageID, body)`

Edits an existing message sent by the bot.

```ts
await conduit.messages.edit(messageID, "updated text");
```

---

### `.unsend(messageID)`

Retracts a message sent by the bot.

```ts
await conduit.messages.unsend(messageID);
```

---

### `.delete(messageID)`

Deletes a message.

```ts
await conduit.messages.delete(messageID);
```

---

### `.react(emoji, messageID, threadID)`

Adds or removes a reaction on a message.

```ts
await conduit.messages.react("👍", messageID, threadID);
```

---

### `.sendTypingIndicator(threadID)`

Sends a typing indicator to a thread.

```ts
await conduit.messages.sendTypingIndicator(threadID);
```

---

### `.markAsRead(messageID)`

Marks a message as read.

```ts
await conduit.messages.markAsRead(messageID);
```

---

### `.uploadAttachment(file)`

Uploads a file attachment and returns an attachment object that can be used in subsequent sends.

```ts
const attachment = await conduit.messages.uploadAttachment(stream);
```

---

### `.forwardAttachment(attachmentID, threadID)`

Forwards an existing attachment to another thread.

```ts
await conduit.messages.forwardAttachment(attachmentID, threadID);
```

---

### `.shareContact(userID, threadID)`

Shares a contact card to a thread.

```ts
await conduit.messages.shareContact(userID, threadID);
```

---

### `.changeThreadColor(color, threadID)`

Changes the color theme of a thread.

```ts
await conduit.messages.changeThreadColor("#FF0000", threadID);
```

---

### `.changeThreadEmoji(emoji, threadID)`

Changes the quick-reaction emoji of a thread.

```ts
await conduit.messages.changeThreadEmoji("🔥", threadID);
```

---

### `.getMessage(messageID)`

Fetches a specific message by ID.

```ts
const message = await conduit.messages.getMessage(messageID);
```

---

### `.getThreadColors()`

Returns all available thread color themes.

```ts
const colors = await conduit.messages.getThreadColors();
```

---

## client.threads

Accessible via `conduit.threads`. Handles thread-level operations.

---

### `.getInfo(threadID)`

Fetches detailed info about a thread including participants, name, and settings.

```ts
const info = await conduit.threads.getInfo(threadID);
```

---

### `.getList(limit, cursor, folders)`

Fetches a paginated list of threads.

```ts
const threads = await conduit.threads.getList(10, null, ["INBOX"]);
```

---

### `.getHistory(threadID, limit)`

Fetches message history for a thread.

```ts
const history = await conduit.threads.getHistory(threadID, 20);
```

---

### `.search(query)`

Searches for threads by name or keyword.

```ts
const results = await conduit.threads.search("dev chat");
```

---

### `.createGroup(userIDs, name?)`

Creates a new group conversation.

```ts
const thread = await conduit.threads.createGroup(["uid1", "uid2"], "my group");
```

---

### `.addUser(userID, threadID)`

Adds a user to an existing group thread.

```ts
await conduit.threads.addUser(userID, threadID);
```

---

### `.removeUser(userID, threadID)`

Removes a user from a group thread.

```ts
await conduit.threads.removeUser(userID, threadID);
```

---

### `.changeAdminStatus(userID, threadID, admin)`

Promotes or demotes a user's admin status in a group.

```ts
await conduit.threads.changeAdminStatus(userID, threadID, true); // promote
await conduit.threads.changeAdminStatus(userID, threadID, false); // demote
```

---

### `.changeGroupImage(image, threadID)`

Updates the group's profile image.

```ts
await conduit.threads.changeGroupImage(stream, threadID);
```

---

### `.changeNickname(nickname, threadID, userID)`

Sets a participant's nickname. Pass an empty string to clear.

```ts
await conduit.threads.changeNickname("nick", threadID, userID);
await conduit.threads.changeNickname("", threadID, userID); // clear
```

---

### `.setTitle(title, threadID)`

Changes the title of a group thread.

```ts
await conduit.threads.setTitle("new title", threadID);
```

---

### `.createPoll(title, threadID, options)`

Creates a poll in a thread.

```ts
await conduit.threads.createPoll("Favourite language?", threadID, [
  "TypeScript",
  "Python",
]);
```

---

### `.delete(threadID)`

Deletes a thread.

```ts
await conduit.threads.delete(threadID);
```

---

### `.mute(threadID, muteUntil)`

Mutes or unmutes notifications for a thread.

```ts
await conduit.threads.mute(threadID, -1); // mute indefinitely
await conduit.threads.mute(threadID, 0); // unmute
```

---

### `.handleMessageRequest(threadID, accept)`

Accepts or declines a message request.

```ts
await conduit.threads.handleMessageRequest(threadID, true);
```

---

## client.users

Accessible via `conduit.users`. Handles user-related operations.

---

### `.getInfo(userID)`

Fetches info for one or more users by ID.

```ts
const user = await conduit.users.getInfo("uid");
const users = await conduit.users.getInfo(["uid1", "uid2"]);
```

---

### `.getID(vanity)`

Resolves a vanity URL or username to a Facebook user ID.

```ts
const id = await conduit.users.getID("zuck");
```

---

### `.getFriendsList()`

Returns the authenticated user's friends list.

```ts
const friends = await conduit.users.getFriendsList();
```

---

## client.account

Accessible via `conduit.account`. Handles account-level operations for the authenticated user.

---

### `.getCurrentUserID()`

Returns the logged-in user's Facebook ID synchronously.

```ts
const myID = conduit.account.getCurrentUserID();
```

---

### `.blockUser(userID, block)`

Blocks or unblocks a user.

```ts
await conduit.account.blockUser(userID, true); // block
await conduit.account.blockUser(userID, false); // unblock
```

---

### `.handleFriendRequest(userID, accept)`

Accepts or declines a friend request.

```ts
await conduit.account.handleFriendRequest(userID, true);
```

---

### `.unfriend(userID)`

Removes a user from the friends list.

```ts
await conduit.account.unfriend(userID);
```

---

### `.logout()`

Ends the current session and invalidates cookies.

```ts
await conduit.account.logout();
```

---

## Types

Key types exported from conduit. See `src/types.ts` for the full source.

### `ConduitCredentials`

```ts
interface ConduitCredentials {
  appstate?: string[];
  cookies?: string;
  account?: {
    email: string;
    password: string;
  };
}
```

### `Message`

```ts
interface Message {
  threadID: string;
  messageID: string;
  senderID: string;
  body: string;
  attachments: any[];
  mentions: Record<string, string>;
  timestamp: string;
  participantIDs: string[];
}
```

### `Middleware<K>`

```ts
type Middleware<K extends keyof ConduitEvents> = (
  data: Parameters<ConduitEvents[K]>[0],
  next?: () => Promise<void>,
) => Promise<void>;
```

### `ConduitEvents`

The full map of event names to their payload types. See `src/types.ts` for all payload shapes (`MessageCreatePayload`, `ThreadTitleChangePayload`, etc.).
