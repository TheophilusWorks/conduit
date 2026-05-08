# Conduit — API Reference

Full reference for all APIs exposed by `ConduitClient`.

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
import { ConduitClient } from "@theophilusdev/conduit";

const client = new ConduitClient(config);
await client.login(credentials);
```

---

### Constructor

```ts
new ConduitClient(config: ConduitClientConfig)
```

Creates a new Conduit client instance.

- Extends `MessengerBotOptions` from `@dongdev/fca-unofficial`
- `logLevel` defaults to `"silent"`

---

### `.login(credentials)`

Authenticates with Messenger and initializes the client.

```ts
await client.login(credentials: ConduitCredentials): Promise<ConduitClient>
```

Returns the client instance for chaining.

---

### `.on(event, ...middlewares)`

Registers one or more middleware handlers for a Conduit event.

```ts
client.on(event: keyof ConduitEvents, ...middlewares: Middleware[]): this
```

```ts
client.on("message:create", async (ctx, next) => {
  await ctx.reply("hello!");
  await next();
});
```

---

### `.onFca(event, ...middlewares)`

Registers middleware directly on raw FCA events.

```ts
client.onFca(event: string, ...middlewares): this
```

---

### `.api`

Direct access to the raw FCA API.

```ts
client.api.getThreadList(10, null, ["INBOX"]);
```

---

## client.messages

Accessible via:

```ts
client.messages;
```

Handles message-level operations.

---

### `.send(body, threadID)`

Sends a plain text message to a thread.

```ts
await client.messages.send("hello", threadID);
```

---

### `.reply(body, threadID, messageID)`

Sends a reply to a specific message.

```ts
await client.messages.reply("got it", threadID, messageID);
```

---

### `.edit(messageID, body)`

Edits an existing message.

```ts
await client.messages.edit(messageID, "updated text");
```

---

### `.unsend(messageID)`

Retracts a message sent by the bot.

```ts
await client.messages.unsend(messageID);
```

---

### `.delete(messageID)`

Deletes a message.

```ts
await client.messages.delete(messageID);
```

---

### `.react(emoji, messageID, threadID)`

Adds or removes a reaction on a message.

```ts
await client.messages.react("👍", messageID, threadID);
```

---

### `.sendTypingIndicator(threadID)`

Sends a typing indicator.

```ts
await client.messages.sendTypingIndicator(threadID);
```

---

### `.markAsRead(messageID)`

Marks a message as read.

```ts
await client.messages.markAsRead(messageID);
```

---

### `.uploadAttachment(file)`

Uploads a file attachment.

```ts
const attachment = await client.messages.uploadAttachment(stream);
```

---

### `.forwardAttachment(attachmentID, threadID)`

Forwards an attachment to another thread.

```ts
await client.messages.forwardAttachment(attachmentID, threadID);
```

---

### `.shareContact(userID, threadID)`

Shares a contact card.

```ts
await client.messages.shareContact(userID, threadID);
```

---

### `.changeThreadColor(color, threadID)`

Changes thread color.

```ts
await client.messages.changeThreadColor("#FF0000", threadID);
```

---

### `.changeThreadEmoji(emoji, threadID)`

Changes thread emoji.

```ts
await client.messages.changeThreadEmoji("🔥", threadID);
```

---

### `.getMessage(messageID)`

Fetches a message by ID.

```ts
const message = await client.messages.getMessage(messageID);
```

---

### `.getThreadColors()`

Returns available thread colors.

```ts
const colors = await client.messages.getThreadColors();
```

---

## client.threads

Accessible via:

```ts
client.threads;
```

Handles thread-level operations.

---

### `.getInfo(threadID)`

Fetches thread information.

```ts
const info = await client.threads.getInfo(threadID);
```

---

### `.getList(limit, cursor, folders)`

Fetches a list of threads.

```ts
const threads = await client.threads.getList(10, null, ["INBOX"]);
```

---

### `.getHistory(threadID, limit)`

Fetches message history.

```ts
const history = await client.threads.getHistory(threadID, 20);
```

---

### `.search(query)`

Searches threads.

```ts
const results = await client.threads.search("dev chat");
```

---

### `.createGroup(userIDs, name?)`

Creates a group conversation.

```ts
const thread = await client.threads.createGroup(["uid1", "uid2"], "my group");
```

---

### `.addUser(userID, threadID)`

Adds a user to a thread.

```ts
await client.threads.addUser(userID, threadID);
```

---

### `.removeUser(userID, threadID)`

Removes a user from a thread.

```ts
await client.threads.removeUser(userID, threadID);
```

---

### `.changeAdminStatus(userID, threadID, admin)`

Changes admin status.

```ts
await client.threads.changeAdminStatus(userID, threadID, true);
```

---

### `.changeGroupImage(image, threadID)`

Updates group image.

```ts
await client.threads.changeGroupImage(stream, threadID);
```

---

### `.changeNickname(nickname, threadID, userID)`

Sets nickname.

```ts
await client.threads.changeNickname("nick", threadID, userID);
```

---

### `.setTitle(title, threadID)`

Changes thread title.

```ts
await client.threads.setTitle("new title", threadID);
```

---

### `.createPoll(title, threadID, options)`

Creates a poll.

```ts
await client.threads.createPoll("Favourite language?", threadID, [
  "TypeScript",
  "Python",
]);
```

---

### `.delete(threadID)`

Deletes a thread.

```ts
await client.threads.delete(threadID);
```

---

### `.mute(threadID, muteUntil)`

Mutes or unmutes a thread.

```ts
await client.threads.mute(threadID, -1);
await client.threads.mute(threadID, 0);
```

---

### `.handleMessageRequest(threadID, accept)`

Handles message requests.

```ts
await client.threads.handleMessageRequest(threadID, true);
```

---

## client.users

Accessible via:

```ts
client.users;
```

---

### `.getInfo(userID)`

Fetches user info.

```ts
const user = await client.users.getInfo("uid");
const users = await client.users.getInfo(["uid1", "uid2"]);
```

---

### `.getID(vanity)`

Resolves username to ID.

```ts
const id = await client.users.getID("zuck");
```

---

### `.getFriendsList()`

Returns friends list.

```ts
const friends = await client.users.getFriendsList();
```

---

## client.account

Accessible via:

```ts
client.account;
```

---

### `.getCurrentUserID()`

Returns current user ID.

```ts
const myID = client.account.getCurrentUserID();
```

---

### `.blockUser(userID, block)`

Blocks or unblocks a user.

```ts
await client.account.blockUser(userID, true);
```

---

### `.handleFriendRequest(userID, accept)`

Handles friend requests.

```ts
await client.account.handleFriendRequest(userID, true);
```

---

### `.unfriend(userID)`

Removes a friend.

```ts
await client.account.unfriend(userID);
```

---

### `.logout()`

Logs out of the session.

```ts
await client.account.logout();
```

---

## Types

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

---

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

---

### `Middleware<K>`

```ts
type Middleware<K extends keyof ConduitEvents> = (
  data: Parameters<ConduitEvents[K]>[0],
  next?: () => Promise<void>,
) => Promise<void>;
```

---

### `ConduitEvents`

Full event map is defined in `src/types.ts`.
