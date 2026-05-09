# @theophilusdev/conduit

[![GitHub](https://img.shields.io/badge/github-TheophilusWorks%2Fconduit-blue?logo=github)](https://github.com/TheophilusWorks/conduit)

> A lightweight TypeScript wrapper around [`@dongdev/fca-unofficial`](https://github.com/dongp06/fca-unofficial) with a clean, middleware-based event system.

```ts
import { ConduitClient } from "@theophilusdev/conduit";

const client = new ConduitClient({ listenEvents: true });
await client.login({ appstate });

client.on("message:create", async (ctx) => {
  await ctx.reply(`hey, you said: ${ctx.body}`);
});
```

## Install

```bash
npm install @theophilusdev/conduit
```

## Quick Start

```ts
import { ConduitClient } from "@theophilusdev/conduit";
import appstate from "./appstate.json" assert { type: "json" };

const client = new ConduitClient({ listenEvents: true });

await client.login({ appstate });

client.on("message:create", async (ctx, next) => {
  if (ctx.body === "ping") {
    await ctx.reply("pong");
    return;
  }

  await next();
});
```

## Authentication

Pass **one** of the following to `.login()`:

| Strategy         | Field                                | Notes                                             |
| ---------------- | ------------------------------------ | ------------------------------------------------- |
| App state        | `appstate`                           | Recommended                                       |
| Raw cookies      | `cookies`                            | Cookie header string                              |
| Email + password | `account.email` / `account.password` | Triggers checkpoints easily — avoid in production |

```ts
// appstate (recommended)
await client.login({ appstate: [...] });

// raw cookies
await client.login({ cookies: "c_user=...; xs=..." });

// email/password (not recommended)
await client.login({
  account: { email: "...", password: "..." },
});
```

## Events

Register handlers with `.on(event, ...middlewares)`.

Handlers receive a context object and an optional `next()` function for middleware chaining.

All events include:

- `send(body)` — send a message to the same thread

Message events additionally include:

- `reply(body)` — quoted reply to the triggering message
- `react(emoji)` — react to the triggering message

Both `send()` and `reply()` accept a plain string or a `ConduitMessageBody` object for rich messages with attachments and mentions.

### Message Events

| Event             | Description                                      |
| ----------------- | ------------------------------------------------ |
| `message:create`  | New message received                             |
| `message:respond` | Reply to an existing message                     |
| `message:remove`  | Message unsent by sender                         |
| `message:react`   | Reaction added or removed                        |
| `message:writing` | Typing indicator (requires `listenTyping: true`) |
| `message:read`    | Thread or message marked as read                 |

### User Events

| Event         | Description                                  |
| ------------- | -------------------------------------------- |
| `user:create` | User added to a group thread                 |
| `user:remove` | User left or was removed from a group thread |

### Thread Events

| Event                     | Description                  |
| ------------------------- | ---------------------------- |
| `thread:update`           | Catch-all for thread updates |
| `thread:title_change`     | Group title updated          |
| `thread:photo_replaced`   | Group photo changed          |
| `thread:theme_changed`    | Chat theme changed           |
| `thread:nickname_changed` | Participant nickname updated |
| `thread:admin_changed`    | Admin role changed           |

## Middleware

`.on()` accepts multiple handlers. Each must call `next()` to continue the chain.

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

## Raw FCA Access

Drop down to FCA when needed:

```ts
// raw FCA event
client.onFca("presence", async (data) => {
  console.log(data);
});

// raw FCA API (no type safety)
client.api.getThreadList(10, null, ["INBOX"]);
```

## API Reference

See [docs/DOCS.md](docs/DOCS.md) for full API details:

- `client.messages`
- `client.threads`
- `client.users`
- `client.account`

## License

GNU GPL v3 © theophilusdev

---

Built on top of [`@dongdev/fca-unofficial`](https://github.com/dongp06/fca-unofficial).
