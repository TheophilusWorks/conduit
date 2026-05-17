# Conduit — API Reference

Full reference for all APIs exposed by `ConduitClient`.

## Table of Contents

- [ConduitClient](#conduitclient)
- [Collectors & Reply Waiting](#collectors--reply-waiting)
  - [SentMessage](#sentmessage)
  - [collect()](#collect)
  - [waitReply()](#waitreply)
  - [ConduitMessageCollector](#conduitmessagecollector)
  - [CollectorOptions](#collectoroptions)
  - [The `events` array](#the-events-array)
  - [The `type` field](#the-type-field)
  - [Patterns](#patterns)
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
  cache: {
    userCache: { ttlInMS: 60_000 },
  },
});

await client.login({ appstate });
```

---

### Constructor

```ts
new ConduitClient(config: ConduitClientConfig)
```

Creates a new Conduit client instance. Config extends `MessengerBotOptions` from `@dongdev/fca-unofficial` with the following additions:

| Field                | Type                 | Default    | Description                                           |
| -------------------- | -------------------- | ---------- | ----------------------------------------------------- |
| `logLevel`           | `string`             | `"silent"` | FCA log verbosity                                     |
| `queue.messageQueue` | `ConduitQueueConfig` | —          | Enables message queuing with delays                   |
| `queue.threadQueue`  | `ConduitQueueConfig` | —          | Enables thread operation queuing                      |
| `cache.userCache`    | `ConduitCacheConfig` | —          | Enables sliding-window cache for `client.users` calls |

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

Registers one or more middleware handlers for a Conduit event.

```ts
client.on(event: keyof ConduitEvents, ...middlewares: Middleware[]): this
```

All event payloads are enriched with helper methods:

- **All events** — `send(body)` sends a message to the same thread
- **`message:create`, `message:respond`** — additionally expose `reply(body)`, `react(emoji)`, `collect()`, and `waitReply()`
- **`thread:*`, `user:create`, `user:remove`** — additionally expose `changeNickname()` and `changeAdminStatus()`

Every payload also carries a `type` field matching its Conduit event name — useful for narrowing unions in shared handlers and collectors.

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

## Collectors & Reply Waiting

Conduit has a built-in system for waiting on future messages after your bot sends one. Every `send()` and `reply()` call returns a `SentMessage` object that exposes two methods:

- **`collect()`** — streams multiple incoming events over time via an EventEmitter
- **`waitReply()`** — awaits a single matching event as a Promise

Both are powered by an internal typed event bus. Collectors receive fully enriched Conduit payloads — the same objects you get in `client.on()` handlers, complete with `send()`, `reply()`, `react()`, and `type`.

---

### SentMessage

Returned by `ctx.send()`, `ctx.reply()`, `client.messages.send()`, and `client.messages.reply()`.

```ts
interface SentMessage {
  messageID: string;
  threadID: string;

  // default — listens to "message:respond" only
  collect(options: CollectorOptions): ConduitMessageCollector;

  // custom events — payload union is derived from the events array
  collect<K extends readonly (keyof ConduitEvents)[]>(
    events: K,
    options: CollectorOptions<K>,
  ): ConduitMessageCollector<K>;

  // default — resolves with MessageRespondPayload
  waitReply(
    options: Omit<CollectorOptions, "max">,
  ): Promise<MessageRespondPayload>;

  // custom events — resolves with the unioned payload type
  waitReply<K extends readonly (keyof ConduitEvents)[]>(
    events: K,
    options: Omit<CollectorOptions<K>, "max">,
  ): Promise<CollectorPayload<K>>;
}
```

`collect()` and `waitReply()` are also available directly on `ctx` inside `message:create` and `message:respond` handlers — they work identically.

---

### `.collect()`

Creates a `ConduitMessageCollector` that listens for incoming events and emits them as they arrive.

#### Default — replies only

When called with just an options object, the collector listens to `"message:respond"` only. The `filter` callback and `collect` event payload are typed as `MessageRespondPayload`.

```ts
const sent = await ctx.reply("say something!");

const collector = sent.collect({
  timeout: 30_000, // optional - ms before the collector auto-stops
  max: 5, // optional — stop after this many collected events
  filter: (msg) => msg.senderID === ctx.senderID,
});

collector.on("collect", async (msg) => {
  // msg is MessageRespondPayload
  await msg.reply(`you said: ${msg.body}`);
});

collector.on("end", async (collected, reason) => {
  await ctx.reply(`got ${collected.size} replies. stopped: ${reason}`);
});
```

#### Custom events — union payload

Pass an events array as the **first argument** to subscribe to multiple event types at once. The `filter` callback and `collect` event payload are automatically typed as a union of all listed event payloads.

```ts
const collector = sent.collect(["message:respond", "message:react"], {
  timeout: 60_000,
  filter: (e) => {
    // e is MessageRespondPayload | MessageReactPayload

    if (e.type === "message:react") return e.reactorID === ctx.senderID;
    else return e.senderID === ctx.senderID;
  },
});

collector.on("collect", async (event) => {
  // event is MessageRespondPayload | MessageReactPayload
  
  if (event.type === "message:react") {
    await ctx.reply(`you reacted: ${event.reaction}`);
  } else {
    await ctx.reply(`you said: ${event.body}`);
  }
});
```

---

### `.waitResponse()`

Waits for a single matching event and resolves with it. Rejects with an error if the timeout expires before any matching event arrives.

Internally creates a collector with `max: 1`, resolves on the first collected event, and stops the collector with reason `"fulfilled"`.

#### Default — replies only

```ts
const sent = await ctx.reply("what's your name?");

try {
  const reply = await sent.waitResponse({ timeout: 15_000 });
  // reply is MessageRespondPayload
  await ctx.reply(`nice to meet you, ${reply.body}!`);
} catch {
  await ctx.reply("you took too long!");
}
```

#### Custom events

Pass an events array as the **first argument**. The resolved value is typed as a union of those event payloads.

```ts
const sent = await ctx.reply("react or reply to this!");

try {
  const response = await sent.waitResponse(
    ["message:respond", "message:react"],
    { timeout: 15_000 },
  );

  // response is MessageRespondPayload | MessageReactPayload
  if (response.type === "message:react") {
    await ctx.reply(`you reacted: ${response.reaction}`);
  } else {
    await ctx.reply(`you replied: ${response.body}`);
  }
} catch {
  await ctx.reply("no response!");
}
```

---

### ConduitMessageCollector

A stateful, `EventEmitter`-based class that subscribes to the internal Conduit event bus and emits typed events as matching messages arrive.

#### Events

| Event     | Signature                                                                 | Description                                        |
| --------- | ------------------------------------------------------------------------- | -------------------------------------------------- |
| `collect` | `(message: T) => void`                                                    | Fires for each event that passes the filter        |
| `end`     | `(collected: ReadonlyMap<string, T>, reason: CollectorEndReason) => void` | Fires once when the collector stops for any reason |

#### Properties

| Property    | Type                     | Description                                       |
| ----------- | ------------------------ | ------------------------------------------------- |
| `collected` | `ReadonlyMap<string, T>` | All events collected so far, indexed by messageID |
| `count`     | `number`                 | Number of events collected so far                 |
| `ended`     | `boolean`                | Whether the collector has stopped                 |

#### `.stop(reason?)`

Manually stops the collector. Emits `"end"` with the provided reason. No-ops if already ended.

```ts
collector.stop(); // reason: "manual"
collector.stop("fulfilled"); // reason: "fulfilled"
```

#### `CollectorEndReason`

| Reason      | When                                                    |
| ----------- | ------------------------------------------------------- |
| `timeout`   | The `timeout` duration elapsed                          |
| `limit`     | The `max` count was reached                             |
| `manual`    | `.stop()` was called without a reason                   |
| `fulfilled` | Used by `waitReply` after it resolves the first message |

---

### CollectorOptions

```ts
interface CollectorOptions<
  K extends readonly (keyof ConduitEvents)[] = ["message:respond"],
> {
  timeout: number;
  max?: number;
  filter?: (message: CollectorPayload<K>) => boolean | Promise<boolean>;
}
```

| Field     | Type                   | Default  | Description                                                                                                                                                          |
| --------- | ---------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `timeout` | `number`               | required | How long (ms) before the collector stops with reason `"timeout"`                                                                                                     |
| `max`     | `number`               | —        | Max events before stopping with reason `"limit"`                                                                                                                     |
| `filter`  | `(message) => boolean` | —        | Predicate to filter incoming events. Can be async. The parameter type is the union of all subscribed event payloads — pass `events` first so TypeScript can infer it |

---

### The `events` array

The events array controls which Conduit events the collector subscribes to. It is passed as the **first argument** to `collect()` and `waitReply()`, separate from the options object.

This separation is intentional. TypeScript resolves generics left-to-right — by passing `events` as a standalone argument before the options object, TypeScript knows the payload union before it tries to type the `filter` callback. If `events` were inside the options object alongside `filter`, TypeScript would try to infer both at the same time and fail to narrow the union correctly.

**Any Conduit event is valid:**

```ts
sent.collect(["message:respond", "message:react", "message:writing"], {
  timeout: 30_000,
  filter: (e) => {
    // e is MessageRespondPayload | MessageReactPayload | MessageWritingPayload
    if (e.type === "message:writing") return e.isTyping;
    return true;
  },
});
```

**When no events array is passed**, the collector defaults to `["message:respond"]`:

```ts
// these two are equivalent
sent.collect({ timeout: 30_000 });
sent.collect(["message:respond"], { timeout: 30_000 });
```

---

### The `type` field

Every Conduit payload has a `type` field that matches its event name exactly. This is the correct way to narrow a union inside a collector's `collect` callback, `filter`, or any shared handler function.

```ts
collector.on("collect", async (event) => {
  switch (event.type) {
    case "message:respond":
      // event is MessageRespondPayload
      await event.reply(`you said: ${event.body}`);
      break;

    case "message:react":
      // event is MessageReactPayload
      await event.send(`you reacted: ${event.reaction}`);
      break;

    case "message:writing":
      // event is MessageWritingPayload
      console.log("typing:", event.isTyping);
      break;
  }
});
```

Also works in shared handler functions:

```ts
async function handleIncoming(
  ctx: MessageCreatePayload | MessageRespondPayload,
) {
  if (ctx.type === "message:respond") {
    console.log("replied to:", ctx.messageReply.body);
  } else {
    console.log("new message:", ctx.body);
  }
}

client.on("message:create", (ctx) => handleIncoming(ctx));
client.on("message:respond", (ctx) => handleIncoming(ctx));
```

---

### Patterns

#### Ask a question, wait for one reply

```ts
client.on("message:create", async (ctx) => {
  if (ctx.body !== "!name") return;

  const sent = await ctx.reply("what's your name?");

  try {
    const reply = await sent.waitReply({ timeout: 15_000 });
    await ctx.reply(`nice to meet you, ${reply.body}!`);
  } catch {
    await ctx.reply("you took too long!");
  }
});
```

#### Multi-step conversation

Chain `waitReply` calls to build sequential conversation flows.

```ts
client.on("message:create", async (ctx) => {
  if (ctx.body !== "!form") return;

  const q1 = await ctx.reply("what's your name?");
  const name = await q1.waitReply({ timeout: 15_000 });

  const q2 = await ctx.reply(`hey ${name.body}! how old are you?`);
  const age = await q2.waitReply({ timeout: 15_000 });

  const q3 = await ctx.reply("what city are you from?");
  const city = await q3.waitReply({ timeout: 15_000 });

  await ctx.reply(`registered: ${name.body}, ${age.body}, ${city.body}`);
});
```

#### Collect multiple replies

```ts
client.on("message:create", async (ctx) => {
  if (ctx.body !== "!collect") return;

  const sent = await ctx.reply("say something 3 times!");
  const collector = sent.collect({ timeout: 30_000, max: 3 });

  collector.on("collect", async (msg) => {
    await ctx.reply(`got (${collector.count}/3): ${msg.body}`);
  });

  collector.on("end", async (collected, reason) => {
    await ctx.reply(`done! ${collected.size} messages. reason: ${reason}`);
  });
});
```

#### Collect replies AND reactions

```ts
client.on("message:create", async (ctx) => {
  if (ctx.body !== "!poll") return;

  const sent = await ctx.reply("react 👍 or 👎, or reply with your thoughts!");

  const collector = sent.collect(
    ["message:respond", "message:react"] as const,
    {
      timeout: 30_000,
      filter: (e) => {
        if (e.type === "message:react") return e.reactorID === ctx.senderID;
        return e.senderID === ctx.senderID;
      },
    },
  );

  collector.on("collect", async (event) => {
    if (event.type === "message:react") {
      await ctx.reply(`got a reaction: ${event.reaction}`);
    } else {
      await ctx.reply(`got a reply: ${event.body}`);
    }
  });

  collector.on("end", async (collected, reason) => {
    await ctx.reply(
      `poll closed. ${collected.size} responses. reason: ${reason}`,
    );
  });
});
```

#### Filter by sender

```ts
client.on("message:create", async (ctx) => {
  if (ctx.body !== "!confirm") return;

  const sent = await ctx.reply("type 'yes' to confirm.");

  try {
    const reply = await sent.waitResponse({
      timeout: 15_000,
      filter: (msg) =>
        msg.senderID === ctx.senderID && msg.body.toLowerCase() === "yes",
    });
    await ctx.reply(`confirmed by ${reply.senderID}!`);
  } catch {
    await ctx.reply("confirmation timed out.");
  }
});
```

#### waitResponse with union events

```ts
client.on("message:create", async (ctx) => {
  if (ctx.body !== "!react") return;

  const sent = await ctx.reply("react or reply to this message!");

  try {
    const response = await sent.waitResponse(
      ["message:respond", "message:react"] as const,
      { timeout: 15_000 },
    );

    if (response.type === "message:react") {
      await ctx.reply(`you reacted with ${response.reaction}!`);
    } else {
      await ctx.reply(`you replied: ${response.body}`);
    }
  } catch {
    await ctx.reply("no response!");
  }
});
```

#### Manually stopping a collector

```ts
client.on("message:create", async (ctx) => {
  if (ctx.body !== "!stop") return;

  const sent = await ctx.reply("collecting... say 'stop' to end early.");
  const collector = sent.collect({ timeout: 60_000 });

  collector.on("collect", async (msg) => {
    if (msg.body.toLowerCase() === "stop") {
      collector.stop();
      return;
    }
    await ctx.reply(`got: ${msg.body}`);
  });

  collector.on("end", async (collected, reason) => {
    await ctx.reply(`ended with ${collected.size} messages. reason: ${reason}`);
  });
});
```

---

## client.messages

Handles all message-level operations. Accessible via `client.messages`.

Methods that produce visible output (`send`, `reply`, `changeThreadColor`, `changeThreadEmoji`) are automatically enqueued when `queue.messageQueue` is configured.

---

### `.send(body, threadID)`

Sends a message to a thread. Fires a typing indicator before sending. Returns a `SentMessage`.

```ts
const sent = await client.messages.send("hello", threadID);

const sent = await client.messages.send(
  { body: "hey @user", mentions: [{ tag: "@user", id: "uid", fromIndex: 4 }] },
  threadID,
);

const sent = await client.messages.send(
  MessageBuilder.create().body("hey @user").mention("@user", "uid", 4),
  threadID,
);
```

---

### `.reply(body, threadID, messageID)`

Sends a quoted reply to a specific message. Fires a typing indicator before sending. Returns a `SentMessage`.

```ts
const sent = await client.messages.reply("got it", threadID, messageID);
const reply = await sent.waitReply({ timeout: 15_000 });
```

---

### `.edit(messageID, body)`

```ts
await client.messages.edit(messageID, "updated text");
```

---

### `.unsend(messageID)`

```ts
await client.messages.unsend(messageID);
```

---

### `.delete(messageID)`

```ts
await client.messages.delete(messageID);
```

---

### `.react(emoji, messageID, threadID)`

Adds or removes a reaction. Includes a short random delay to appear more human.

```ts
await client.messages.react("👍", messageID, threadID);
```

---

### `.sendTypingIndicator(threadID)`

`send()` and `reply()` fire this automatically. Call manually if needed.

```ts
await client.messages.sendTypingIndicator(threadID);
```

---

### `.markAsRead(messageID)`

```ts
await client.messages.markAsRead(messageID);
```

---

### `.uploadAttachment(file)`

```ts
const attachment = await client.messages.uploadAttachment(stream);
const attachment = await client.messages.uploadAttachment(
  ConduitAttachmentBuilder.create().from("./image.png"),
);
```

---

### `.forwardAttachment(attachmentID, threadID)`

```ts
await client.messages.forwardAttachment(attachmentID, threadID);
```

---

### `.shareContact(userID, threadID)`

```ts
await client.messages.shareContact(userID, threadID);
```

---

### `.changeThreadColor(color, threadID)`

```ts
await client.messages.changeThreadColor("#FF0000", threadID);
```

---

### `.changeThreadEmoji(emoji, threadID)`

```ts
await client.messages.changeThreadEmoji("🔥", threadID);
```

---

### `.getMessage(messageID)`

```ts
const message = await client.messages.getMessage(messageID);
```

---

### `.getThreadColors()`

```ts
const colors = await client.messages.getThreadColors();
```

---

## client.threads

Handles thread-level operations. Accessible via `client.threads`.

---

### `.getInfo(threadID)`

```ts
const info = await client.threads.getInfo(threadID);
```

---

### `.getList(limit, cursor, folders)`

```ts
const threads = await client.threads.getList(10, null, ["INBOX"]);
```

---

### `.getHistory(threadID, limit)`

```ts
const history = await client.threads.getHistory(threadID, 20);
```

---

### `.search(query)`

```ts
const results = await client.threads.search("dev chat");
```

---

### `.createGroup(userIDs, name?)`

```ts
const thread = await client.threads.createGroup(["uid1", "uid2"], "my group");
```

---

### `.addUser(userID, threadID)`

```ts
await client.threads.addUser(userID, threadID);
```

---

### `.removeUser(userID, threadID)`

```ts
await client.threads.removeUser(userID, threadID);
```

---

### `.changeAdminStatus(userID, threadID, admin)`

```ts
await client.threads.changeAdminStatus(userID, threadID, true); // promote
await client.threads.changeAdminStatus(userID, threadID, false); // demote
```

---

### `.changeGroupImage(image, threadID)`

```ts
await client.threads.changeGroupImage(stream, threadID);
```

---

### `.changeNickname(nickname, threadID, userID)`

Pass an empty string to clear.

```ts
await client.threads.changeNickname("nick", threadID, userID);
await client.threads.changeNickname("", threadID, userID); // clear
```

---

### `.setTitle(title, threadID)`

```ts
await client.threads.setTitle("new title", threadID);
```

---

### `.createPoll(title, threadID, options)`

```ts
await client.threads.createPoll("Favourite language?", threadID, [
  "TypeScript",
  "Python",
  "JavaScript",
]);
```

---

### `.delete(threadID)`

```ts
await client.threads.delete(threadID);
```

---

### `.mute(threadID, muteUntil)`

Pass `-1` to mute indefinitely, `0` to unmute.

```ts
await client.threads.mute(threadID, -1); // mute forever
await client.threads.mute(threadID, 0); // unmute
```

---

### `.handleMessageRequest(threadID, accept)`

```ts
await client.threads.handleMessageRequest(threadID, true); // accept
await client.threads.handleMessageRequest(threadID, false); // decline
```

---

## client.users

Handles user-related operations. Accessible via `client.users`.

When `cache.userCache` is configured, `getInfo` uses a sliding-expiry cache — each read resets the TTL for that entry. Only uncached IDs hit the API.

---

### `.getInfo(userID)`

Accepts a single ID or an array.

```ts
const user = await client.users.getInfo("uid");
const users = await client.users.getInfo(["uid1", "uid2"]);
```

---

### `.getID(vanity)`

```ts
const id = await client.users.getID("zuck");
```

---

### `.getFriendsList()`

```ts
const friends = await client.users.getFriendsList();
```

---

## client.account

---

### `.getCurrentUserID()`

Synchronous.

```ts
const myID = client.account.getCurrentUserID();
```

---

### `.blockUser(userID, block)`

```ts
await client.account.blockUser(userID, true); // block
await client.account.blockUser(userID, false); // unblock
```

---

### `.handleFriendRequest(userID, accept)`

```ts
await client.account.handleFriendRequest(userID, true); // accept
await client.account.handleFriendRequest(userID, false); // decline
```

---

### `.unfriend(userID)`

```ts
await client.account.unfriend(userID);
```

---

### `.logout()`

```ts
await client.account.logout();
```

---

## Builders

---

## MessageBuilder

Constructs a `ConduitMessageBody` with a chainable API. Pass directly to `send()` or `reply()`.

```ts
import { MessageBuilder } from "@theophilusdev/conduit";
```

### `.body(text)`

```ts
new MessageBuilder().body("hello world");
MessageBuilder.create().body("hello world");
```

### `.mention(tag, id, fromIndex?)`

```ts
new MessageBuilder()
  .body("hey @Alice and @Bob")
  .mention("@Alice", "uid1", 4)
  .mention("@Bob", "uid2", 15);
```

### `.attachment(file)`

```ts
new MessageBuilder()
  .body("here's the file")
  .attachment(
    ConduitAttachmentBuilder.create()
      .from("./report.pdf")
      .from("https://example.com/image.jpg"),
  );
```

### `.sticker(id)`

```ts
new MessageBuilder().sticker("369239263222822");
```

### `.emoji(value, size?)`

```ts
new MessageBuilder().emoji("❤️", "large");
```

### `.url(link)`

```ts
new MessageBuilder().url("https://example.com");
```

### `.build()`

Called automatically by `send()` and `reply()`.

```ts
const body = new MessageBuilder()
  .body("hello")
  .mention("@user", "uid", 6)
  .build();
await client.messages.send(body, threadID);
```

---

## ConduitAttachmentBuilder

Constructs an array of `Readable` streams from various sources.

```ts
import { ConduitAttachmentBuilder } from "@theophilusdev/conduit";
```

### `.from(input)`

| Input                | Behavior                                          |
| -------------------- | ------------------------------------------------- |
| File path (`string`) | `fs.createReadStream`                             |
| URL (`string`)       | Downloads to a temp file, streams, then cleans up |
| `Buffer`             | `Readable.from(buffer)`                           |
| `Readable`           | Passed through as-is                              |

```ts
await client.messages.send(
  MessageBuilder.create()
    .body("check these out")
    .attachment(
      new ConduitAttachmentBuilder()
        .from("./image.png")
        .from("https://example.com/photo.jpg"),
    ),
  threadID,
);
```

### `.build()`

Called automatically by `MessageBuilder.attachment()`.

```ts
const streams = new ConduitAttachmentBuilder().from("./file.pdf").build();
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
  cache?: {
    userCache?: ConduitCacheConfig;
  };
}
```

### `ConduitQueueConfig`

```ts
interface ConduitQueueConfig {
  minDelayMs: number;
  maxDelayMs: number;
  switchDelayMinMs?: number;
  switchDelayMaxMs?: number;
}
```

### `ConduitCacheConfig`

```ts
interface ConduitCacheConfig {
  ttlInMS: number;
  cleanupIntervalInMS: number;
}
```

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

### `EventPayload<K>`

Base interface extended by every Conduit payload. Provides the `type` field.

```ts
interface EventPayload<K extends keyof ConduitEvents = keyof ConduitEvents> {
  type: K;
}
```

### `CollectorPayload<K>`

Derives the union of payload types for a given tuple of Conduit event keys.

```ts
type CollectorPayload<K extends readonly (keyof ConduitEvents)[]> = Extract<
  EventPayload,
  { type: K[number] }
>;
```

### `CollectorOptions<K>`

```ts
interface CollectorOptions<
  K extends readonly (keyof ConduitEvents)[] = ["message:respond"],
> {
  timeout: number;
  max?: number;
  filter?: (message: CollectorPayload<K>) => boolean | Promise<boolean>;
}
```

### `CollectorEndReason`

```ts
type CollectorEndReason = "timeout" | "limit" | "manual" | "fulfilled";
```

### `MessageAttachment`

```ts
type MessageAttachment =
  | PhotoAttachment
  | AudioAttachment
  | StickerAttachment
  | AnimatedImageAttachment
  | UnknownAttachment;
```

### `Middleware<K>`

```ts
type Middleware<K extends keyof ConduitEvents> = (
  data: Parameters<ConduitEvents[K]>[0],
  next: () => Promise<void>,
) => Promise<void>;
```

### `ConduitEvents`

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
