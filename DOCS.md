# Conduit — API Reference

Full reference for all APIs exposed by `ConduitClient`.

## Table of Contents

- [ConduitClient](#conduitclient)
- [client.messages](#clientmessages)
- [client.threads](#clientthreads)
- [client.users](#clientusers)
- [client.account](#clientaccount)
- [Builders](#builders)
  - [MessageBuilder](#messagebuilder)
  - [ConduitAttachmentBuilder](#conduitattachmentbuilder)
- [Types](#types)

---

## ConduitClient

The main entry point for Conduit. Wraps the FCA unofficial API with a typed, middleware-based event system.

```ts
import { ConduitClient } from "@theophilusdev/conduit";

const client = new ConduitClient({
  listenEvents: true,
  autoReconnect: true,
  online: true,
});

await client.login({ appstate });
```

---

### Constructor

```ts
new ConduitClient(config: ConduitClientConfig)
```

Creates a new Conduit client instance. Config extends `MessengerBotOptions` from `@dongdev/fca-unofficial` with the following additions:

| Field                | Type                 | Default    | Description                         |
| -------------------- | -------------------- | ---------- | ----------------------------------- |
| `logLevel`           | `string`             | `"silent"` | FCA log verbosity                   |
| `queue.messageQueue` | `ConduitQueueConfig` | —          | Enables message queuing with delays |
| `queue.threadQueue`  | `ConduitQueueConfig` | —          | Enables thread operation queuing    |

---

### `.login(credentials)`

Authenticates with Messenger and initializes the underlying FCA bot. Must be called before events can be received.

```ts
await client.login(credentials: ConduitCredentials): Promise<ConduitClient>
```

Returns the client instance for chaining.

```ts
// appstate (recommended)
await client.login({ appstate: JSON.stringify(appstate) });

// raw cookies
await client.login({ cookies: "c_user=...; xs=..." });

// email/password (not recommended — triggers checkpoints easily)
await client.login({ account: { email: "...", password: "..." } });
```

---

### `.on(event, ...middlewares)`

Registers one or more middleware handlers for a Conduit event. The first call for a given event also binds the underlying FCA listener.

```ts
client.on(event: keyof ConduitEvents, ...middlewares: Middleware[]): this
```

All event payloads are enriched with helper methods:

- **All events** — `send(body)` sends a message to the same thread
- **`message:create`, `message:respond`** — additionally expose `reply(body)` and `react(emoji)`
- **`thread:*`, `user:create`, `user:remove`** — additionally expose `changeNickname()` and `changeAdminStatus()`

```ts
client.on("message:create", async (ctx, next) => {
  if (ctx.body === "ping") {
    await ctx.reply("pong");
    return;
  }
  await next();
});

client.on("user:create", async (ctx, next) => {
  await ctx.send(`welcome ${ctx.addedParticipants[0].fullName}!`);
  await next();
});

client.on("thread:title_change", async (ctx, next) => {
  await ctx.send(`group renamed to: ${ctx.name}`);
  await next();
});
```

Multiple middlewares can be chained — each must call `next()` to continue:

```ts
client.on(
  "message:create",
  async (ctx, next) => {
    console.log("middleware 1");
    await next();
  },
  async (ctx, next) => {
    console.log("middleware 2");
    await next();
  },
);
```

---

### `.onFca(event, ...middlewares)`

Registers middleware directly against a raw FCA event, bypassing the Conduit abstraction entirely. Useful for events not yet mapped by Conduit.

```ts
client.onFca(event: string, ...middlewares): this
```

```ts
client.onFca("presence", async (data) => {
  console.log(data);
});
```

---

### `.api`

Direct access to the raw FCA API context. No type safety — use as a last resort.

```ts
client.api.getThreadList(10, null, ["INBOX"]);
```

---

## client.messages

Handles all message-level operations. Accessible via `client.messages`.

Methods that produce visible output (`send`, `reply`, `changeThreadColor`, `changeThreadEmoji`) are automatically enqueued when `queue.messageQueue` is configured.

---

### `.send(body, threadID)`

Sends a message to a thread. Fires a typing indicator before sending.

Accepts a plain string, a `ConduitMessageBody` object, or a `MessageBuilder` instance.

```ts
// plain string
await client.messages.send("hello", threadID);

// rich message
await client.messages.send(
  {
    body: "hey @user",
    mentions: [
      {
        tag: "@user",
        id: "uid",
        fromIndex: 4,
      },
    ],
  },
  threadID,
);

// using MessageBuilder
await client.messages.send(
  MessageBuilder.create().body("hey @user").mention("@user", "uid", 4),
  threadID,
);
```

---

### `.reply(body, threadID, messageID)`

Sends a quoted reply to a specific message. Fires a typing indicator before sending.

Accepts a plain string, a `ConduitMessageBody` object, or a `MessageBuilder` instance.

```ts
await client.messages.reply("got it", threadID, messageID);

let attachment = ConduitAttachmentBuilder.create().from("./receipt.png");
await client.messages.reply(
  new MessageBuilder().body("got it").attachment(attachment),
  threadID,
  messageID,
);
```

---

### `.edit(messageID, body)`

Edits an existing message sent by the bot.

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

Adds or removes a reaction on a message. Includes a short random delay to appear more human.

```ts
await client.messages.react("👍", messageID, threadID);
```

---

### `.sendTypingIndicator(threadID)`

Manually sends a typing indicator to a thread. Note: `send()` and `reply()` fire this automatically before sending a message.

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

Uploads a file and returns the attachment object. Accepts a readable stream, buffer, or a `ConduitAttachmentBuilder` instance.

```ts
const attachment = await client.messages.uploadAttachment(stream);

// using ConduitAttachmentBuilder
const attachment = await client.messages.uploadAttachment(
  ConduitAttachmentBuilder.create().from("./image.png"),
);
```

---

### `.forwardAttachment(attachmentID, threadID)`

Forwards an existing attachment to another thread.

```ts
await client.messages.forwardAttachment(attachmentID, threadID);
```

---

### `.shareContact(userID, threadID)`

Shares a contact card to a thread.

```ts
await client.messages.shareContact(userID, threadID);
```

---

### `.changeThreadColor(color, threadID)`

Changes the color theme of a thread. Enqueued when `queue.messageQueue` is configured.

```ts
await client.messages.changeThreadColor("#FF0000", threadID);
```

---

### `.changeThreadEmoji(emoji, threadID)`

Changes the quick-reaction emoji of a thread. Enqueued when `queue.messageQueue` is configured.

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

Returns all available thread color themes.

```ts
const colors = await client.messages.getThreadColors();
```

---

## client.threads

Handles thread-level operations. Accessible via `client.threads`.

Methods that produce visible output (`changeNickname`, `setTitle`, `createPoll`) are automatically enqueued when `queue.threadQueue` is configured.

---

### `.getInfo(threadID)`

Fetches detailed information about a thread.

```ts
const info = await client.threads.getInfo(threadID);
```

---

### `.getList(limit, cursor, folders)`

Fetches a paginated list of threads.

```ts
const threads = await client.threads.getList(10, null, ["INBOX"]);
```

---

### `.getHistory(threadID, limit)`

Fetches message history for a thread.

```ts
const history = await client.threads.getHistory(threadID, 20);
```

---

### `.search(query)`

Searches threads by name or keyword.

```ts
const results = await client.threads.search("dev chat");
```

---

### `.createGroup(userIDs, name?)`

Creates a new group conversation.

```ts
const thread = await client.threads.createGroup(["uid1", "uid2"], "my group");
```

---

### `.addUser(userID, threadID)`

Adds a user to a group thread.

```ts
await client.threads.addUser(userID, threadID);
```

---

### `.removeUser(userID, threadID)`

Removes a user from a group thread.

```ts
await client.threads.removeUser(userID, threadID);
```

---

### `.changeAdminStatus(userID, threadID, admin)`

Promotes or demotes a participant's admin status.

```ts
await client.threads.changeAdminStatus(userID, threadID, true); // promote
await client.threads.changeAdminStatus(userID, threadID, false); // demote
```

---

### `.changeGroupImage(image, threadID)`

Updates the group profile image.

```ts
await client.threads.changeGroupImage(stream, threadID);
```

---

### `.changeNickname(nickname, threadID, userID)`

Sets a participant's nickname. Pass an empty string to clear. Enqueued when `queue.threadQueue` is configured.

```ts
await client.threads.changeNickname("nick", threadID, userID);
await client.threads.changeNickname("", threadID, userID); // clear
```

---

### `.setTitle(title, threadID)`

Changes the title of a group thread. Enqueued when `queue.threadQueue` is configured.

```ts
await client.threads.setTitle("new title", threadID);
```

---

### `.createPoll(title, threadID, options)`

Creates a poll in a thread. Enqueued when `queue.threadQueue` is configured.

```ts
await client.threads.createPoll("Favourite language?", threadID, [
  "TypeScript",
  "Python",
  "JavaScript",
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

Mutes or unmutes notifications for a thread. Pass `-1` to mute indefinitely, `0` to unmute.

```ts
await client.threads.mute(threadID, -1); // mute forever
await client.threads.mute(threadID, 0); // unmute
```

---

### `.handleMessageRequest(threadID, accept)`

Accepts or declines a message request.

```ts
await client.threads.handleMessageRequest(threadID, true); // accept
await client.threads.handleMessageRequest(threadID, false); // decline
```

---

## client.users

Handles user-related operations. Accessible via `client.users`.

---

### `.getInfo(userID)`

Fetches info for one or more users. Accepts a single ID or an array.

```ts
const user = await client.users.getInfo("uid");
const users = await client.users.getInfo(["uid1", "uid2"]);
```

---

### `.getID(vanity)`

Resolves a vanity username or profile URL slug to a Facebook user ID.

```ts
const id = await client.users.getID("zuck");
```

---

### `.getFriendsList()`

Returns the authenticated user's friends list.

```ts
const friends = await client.users.getFriendsList();
```

---

## client.account

Handles account-level operations. Accessible via `client.account`.

---

### `.getCurrentUserID()`

Returns the logged-in user's Facebook ID. Synchronous.

```ts
const myID = client.account.getCurrentUserID();
```

---

### `.blockUser(userID, block)`

Blocks or unblocks a user.

```ts
await client.account.blockUser(userID, true); // block
await client.account.blockUser(userID, false); // unblock
```

---

### `.handleFriendRequest(userID, accept)`

Accepts or declines a friend request.

```ts
await client.account.handleFriendRequest(userID, true); // accept
await client.account.handleFriendRequest(userID, false); // decline
```

---

### `.unfriend(userID)`

Removes a user from the friends list.

```ts
await client.account.unfriend(userID);
```

---

### `.logout()`

Ends the current session and invalidates the app state.

```ts
await client.account.logout();
```

---

## Builders

Conduit ships with two builders for constructing rich messages and attachments using a fluent API.

---

## MessageBuilder

Constructs a `ConduitMessageBody` with a chainable API. Pass directly to `send()` or `reply()` — Conduit builds it internally before sending.

```ts
import { MessageBuilder } from "@theophilusdev/conduit";
```

### `.body(text)`

Sets the message text.

```ts
new MessageBuilder().body("hello world");

// Or

MessageBuilder.create().body("hello world");
```

---

### `.mention(tag, id, fromIndex?)`

Adds a mention. Can be chained multiple times. `fromIndex` is the character index in the body where the tag starts.

```ts
new MessageBuilder()
  .body("hey @Alice and @Bob")
  .mention("@Alice", "uid1", 4)
  .mention("@Bob", "uid2", 15);
```

---

### `.attachment(file)`

Attaches one or more files. Accepts a `ConduitAttachmentBuilder`, a readable stream, or an array of streams.

```ts
new MessageBuilder()
  .body("here's the file")
  .attachment(
    ConduitAttachmentBuilder()
      .create()
      .from("./report.pdf")
      .from("https://example.com/image.jpg"),
  );
```

---

### `.sticker(id)`

Sends a sticker by its Facebook sticker ID.

```ts
new MessageBuilder().sticker("369239263222822");
```

---

### `.emoji(value, size?)`

Sends a large emoji. Size defaults to `"small"`.

```ts
new MessageBuilder().emoji("❤️", "large");
```

---

### `.url(link)`

Attaches a URL to the message.

```ts
new MessageBuilder().url("https://example.com");
```

---

### `.build()`

Builds and returns the `ConduitMessageBody`. Called automatically by `send()` and `reply()` when passed a `MessageBuilder`.

```ts
const body = new MessageBuilder()
  .body("hello")
  .mention("@user", "uid", 6)
  .build();

await client.messages.send(body, threadID);
```

---

## ConduitAttachmentBuilder

Constructs an array of `Readable` streams from various sources. Supports file paths, URLs, `Buffer`s, and existing `Readable` streams.

```ts
import { ConduitAttachmentBuilder } from "@theophilusdev/conduit";
```

### `.from(input)`

Adds an attachment. Can be chained for multiple attachments.

| Input                | Behavior                                          |
| -------------------- | ------------------------------------------------- |
| File path (`string`) | `fs.createReadStream`                             |
| URL (`string`)       | Downloads to a temp file, streams, then cleans up |
| `Buffer`             | `Readable.from(buffer)`                           |
| `Readable`           | Passed through as-is                              |

```ts
const attachments = new ConduitAttachmentBuilder()
  .from("./image.png")
  .from("https://example.com/photo.jpg")
  .from(buffer)
  .from(readableStream);

await client.messages.send(
  MessageBuilder.create().body("check these out").attachment(attachments),
  threadID,
);
```

---

### `.build()`

Returns the array of `Readable` streams. Called automatically when passed to `MessageBuilder.attachment()`.

```ts
const streams = new ConduitAttachmentBuilder().from("./file.pdf").build(); // Readable[]
```

---

## Types

### `ConduitClientConfig`

```ts
interface ConduitClientConfig extends MessengerBotOptions {
  queue?: {
    messageQueue?: ConduitQueueConfig;
    threadQueue?: ConduitQueueConfig;
  };
}
```

---

### `ConduitQueueConfig`

```ts
interface ConduitQueueConfig {
  minDelayMs?: number; // default: 1000
  maxDelayMs?: number; // default: 1500
  switchDelayMinMs?: number; // default: 500 — extra delay when switching threads
  switchDelayMaxMs?: number; // default: 700
}
```

---

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

### `ConduitMessageBody`

```ts
interface ConduitMessageBody {
  body?: string;
  url?: string;
  sticker?: string;
  emoji?: string;
  emojiSize?: "small" | "medium" | "large";
  mentions?: { tag: string; id: string; fromIndex?: number }[];
  attachment?: NodeJS.ReadableStream | NodeJS.ReadableStream[];
}
```

---

### `Message`

Base shape shared across message event payloads.

```ts
interface Message {
  threadID: string;
  messageID: string;
  senderID: string;
  body: string;
  attachments: MessageAttachment[];
  mentions: Record<string, string>;
  timestamp: string;
  participantIDs: string[];
}
```

---

### `MessageAttachment`

Discriminated union of all confirmed attachment types.

```ts
type MessageAttachment =
  | PhotoAttachment
  | AudioAttachment
  | StickerAttachment
  | AnimatedImageAttachment
  | UnknownAttachment;
```

---

### `Middleware<K>`

```ts
type Middleware<K extends keyof ConduitEvents> = (
  data: Parameters<ConduitEvents[K]>[0],
  next: () => Promise<void>,
) => Promise<void>;
```

---

### `ConduitEvents`

Full event map. See `src/types.ts` for all payload shapes.

| Event                     | Trigger                                                  |
| ------------------------- | -------------------------------------------------------- |
| `message:create`          | New message received                                     |
| `message:respond`         | Reply to an existing message                             |
| `message:remove`          | Message unsent                                           |
| `message:react`           | Reaction added or removed                                |
| `message:writing`         | Typing indicator (requires `listenTyping: true`)         |
| `message:read`            | Thread or message marked as read                         |
| `user:create`             | User added to a group thread                             |
| `user:remove`             | User left or was removed                                 |
| `thread:update`           | Catch-all for any thread update                          |
| `thread:title_change`     | Group title changed                                      |
| `thread:photo_replaced`   | Group photo changed                                      |
| `thread:theme_changed`    | Chat theme changed                                       |
| `thread:nickname_changed` | Participant nickname changed                             |
| `thread:admin_changed`    | Admin role changed                                       |
| `client:ready`            | MQTT connection established (requires `emitReady: true`) |
| `client:session_expired`  | Session invalidated                                      |
| `client:checkpoint`       | Security checkpoint triggered                            |
| `client:rate_limit`       | Rate limited by Facebook                                 |
| `client:network_error`    | Network-level error                                      |

---

