# @theophilusdev/conduit

[![GitHub](https://img.shields.io/badge/github-TheophilusWorks%2Fconduit-blue?logo=github)](https://github.com/TheophilusWorks/conduit)

> A lightweight TypeScript wrapper around [`@dongdev/fca-unofficial`](https://github.com/dongp06/fca-unofficial) with a clean, middleware-based event system.

```ts
const conduit = new ConduitClient({ listenEvents: true });
await conduit.login({ appstate });

conduit.on("message:create", async (ctx) => {
  await ctx.reply(`hey, you said: ${ctx.body}`);
});
```

## Install

```bash
npm install @theophilusdev/conduit
```

## Quick Start

```ts
import { ConduitClient } from "conduit";
import appstate from "./appstate.json" assert { type: "json" };

const conduit = new ConduitClient({ listenEvents: true });

await conduit.login({ appstate });

conduit.on("message:create", async (ctx, next) => {
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
await conduit.login({ appstate: [...] });

// raw cookies
await conduit.login({ cookies: "c_user=...; xs=..." });

// email/password (not recommended)
await conduit.login({ account: { email: "...", password: "..." } });
```

## Events

Register handlers with `.on(event, ...middlewares)`. Handlers receive an enriched context object and an optional `next` function to pass control down the stack.

All events include a `send(body)` helper. Events in the `message:*` namespace additionally include `reply(body)` and `react(emoji)`.

### Message Events

| Event             | Trigger                                                        |
| ----------------- | -------------------------------------------------------------- |
| `message:create`  | New message received                                           |
| `message:respond` | Reply to an existing message                                   |
| `message:remove`  | Message unsent by sender                                       |
| `message:react`   | Reaction added or removed                                      |
| `message:writing` | User started or stopped typing (requires `listenTyping: true`) |
| `message:read`    | Thread or message marked as read                               |

### User Events

| Event         | Trigger                                      |
| ------------- | -------------------------------------------- |
| `user:create` | User added to a group thread                 |
| `user:remove` | User left or was removed from a group thread |

### Thread Events

| Event                     | Trigger                                    |
| ------------------------- | ------------------------------------------ |
| `thread:update`           | Any thread metadata change (catch-all)     |
| `thread:title_change`     | Group title updated                        |
| `thread:photo_replaced`   | Group photo changed                        |
| `thread:theme_changed`    | Chat theme or color changed                |
| `thread:nickname_changed` | A participant's nickname changed           |
| `thread:admin_changed`    | A participant promoted or demoted as admin |

## Middleware

`.on()` accepts multiple handlers. Each must call `next()` to pass control to the next one.

```ts
conduit.on(
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

For events or methods not yet covered by conduit, you can drop down to the raw FCA layer:

```ts
// raw FCA event
conduit.onFca("presence", async (data) => {
  console.log(data);
});

// raw FCA api (no type safety)
conduit.api.getThreadList(10, null, ["INBOX"]);
```

## API Reference

See [docs/DOCS.md](docs/DOCS.md) for the full API reference covering `client.messages`, `client.threads`, `client.users`, and `client.account`.

## License

GNU GPL v3 © [theophilusdev](https://github.com/TheophilusWorks)

---

Built on top of [`@dongdev/fca-unofficial`](https://github.com/dongp06/fca-unofficial). Credit to dongp06 and all contributors to the fca-unofficial project.
