import { MessengerBotOptions } from "@dongdev/fca-unofficial";

// ─── Primitives ───────────────────────────────────────────────────────────────

/**
 * A loose string type — behaves like `string` at runtime but preserves
 * literal union autocomplete in the IDE via the `string & {}` trick.
 */
export type Loose = string & {};

// ─── Config & Credentials ─────────────────────────────────────────────────────

/** Configuration options for the Conduit client. Extends {@link MessengerBotOptions}. */
export interface ConduitClientConfig extends MessengerBotOptions {}

/**
 * Credentials used to authenticate the Conduit client with Facebook.
 *
 * Provide **one** of the following strategies (in order of recommendation):
 * - `appstate` — array of appstate objects exported from a browser extension
 * - `cookies` — raw cookie header string (`"c_user=...; xs=..."`)
 * - `account` — email/password fallback (not recommended for production)
 */
export interface ConduitCredentials {
  /** Facebook appstate — array of cookie-like objects. Recommended. */
  appstate?: Loose[];
  /** Raw cookie header string. */
  cookies?: Loose;
  /** Email/password login. Easily triggers checkpoints; avoid in production. */
  account?: {
    email: Loose;
    password: Loose;
  };
}

// ─── Shared Shapes ────────────────────────────────────────────────────────────

/**
 * A message object shared across message events.
 * Attachments are loosely typed until all shapes are confirmed.
 */
export interface Message {
  threadID: string;
  messageID: string;
  senderID: string;
  body: string;
  attachments: any[];
  mentions: Record<string, string>;
  timestamp: number;
  participantIDs: string[];
}

// ─── Message Payloads ─────────────────────────────────────────────────────────

/** Emitted when a new message is received. Maps to FCA `message`. */
export interface MessageCreatePayload extends Message {
  isGroup: boolean;
}

/** Emitted when a user replies to a message. Maps to FCA `message_reply`. */
export interface MessageRespondPayload extends Message {
  isGroup: boolean;
  /** The message being replied to. */
  messageReply: Message;
}

/** Emitted when a message is unsent. Maps to FCA `message_unsend`. */
export interface MessageRemovePayload {
  threadID: string;
  messageID: string;
  senderID: string;
  deletionTimestamp: number;
}

/** Emitted when a reaction is added or removed. Maps to FCA `message_reaction`. */
export interface MessageReactPayload {
  threadID: string;
  messageID: string;
  /** The user who owns the message. */
  senderID: string;
  /** The user who reacted. */
  reactorID: string;
  reaction: string;
}

/** Emitted when a user starts or stops typing. Maps to FCA `typ`. */
export interface MessageWritingPayload {
  threadID: string;
  senderID: string;
  isTyping: boolean;
}

/** Emitted when a thread or message is marked as read. Maps to FCA `read_receipt`. */
export interface MessageReadPayload {
  threadID: string;
  readerID: string;
  time: string;
}

// ─── Events ───────────────────────────────────────────────────────────────────

/**
 * All events emitted by the Conduit event bus.
 *
 * Thread sub-events (join, leave, title change, etc.) arrive as `"event"` from
 * FCA with a `logMessageType` discriminant — Conduit fans those out into the
 * specific `thread:*` events below.
 *
 * @see https://github.com/dongp06/fca-unofficial — Section 15: Events Reference
 */
export interface ConduitEvents {
  // ─── Message ──────────────────────────────────────────────────────────────

  /** A new message was received. Maps to FCA `message`. */
  "message:create": (message: MessageCreatePayload) => Promise<any>;
  /** A message was unsent by its sender. Maps to FCA `message_unsend`. */
  "message:remove": (message: MessageRemovePayload) => Promise<any>;
  /** A reaction was added or removed on a message. Maps to FCA `message_reaction`. */
  "message:react": (message: MessageReactPayload) => Promise<any>;
  /** A reply was sent to an existing message. Maps to FCA `message_reply`. */
  "message:respond": (message: MessageRespondPayload) => Promise<any>;
  /** A user started or stopped typing. Maps to FCA `typ`. Requires `listenTyping: true`. */
  "message:writing": (message: MessageWritingPayload) => Promise<any>;
  /** A thread or message was marked as read. Maps to FCA `read_receipt`. */
  "message:read": (message: MessageReadPayload) => Promise<any>;

  // ─── User ─────────────────────────────────────────────────────────────────

  /** A user joined a group thread. Maps to FCA `event` → `log:subscribe`. */
  "user:create": () => Promise<any>;
  /** A user's presence changed. Maps to FCA `presence`. Requires `updatePresence: true`. */
  "user:presence": () => Promise<any>;
  /** A user was removed from a group thread. Maps to FCA `event` → `log:unsubscribe`. */
  "user:remove": () => Promise<any>;

  // ─── Thread ───────────────────────────────────────────────────────────────

  /** Thread metadata changed (catch-all). Maps to FCA `threadUpdate`. */
  "thread:update": () => Promise<any>;
  /** The thread title was changed. Maps to FCA `event` → `log:thread-name`. */
  "thread:title_change": () => Promise<any>;
  /** The thread photo was changed. Maps to FCA `event` → `log:thread-image`. */
  "thread:photo_replaced": () => Promise<any>;
  /** The thread theme/color was changed. Maps to FCA `event` → `log:thread-color`. */
  "thread:theme_changed": () => Promise<any>;
  /** The thread emoji was changed. Maps to FCA `event` → `log:thread-icon`. */
  "thread:emoji_changed": () => Promise<any>;
  /** A participant's nickname was changed. Maps to FCA `event` → `log:user-nickname`. */
  "thread:nickname_changed": () => Promise<any>;
  /** A participant's admin status was changed. Maps to FCA `event` → `log:admin-text`. */
  "thread:admin_changed": () => Promise<any>;

  // ─── Client ───────────────────────────────────────────────────────────────

  /** MQTT connection established. Maps to FCA `ready`. Requires `emitReady: true`. */
  "client:ready": () => Promise<any>;
  /** Session cookie is no longer valid. Maps to FCA `sessionExpired`. */
  "client:session_expired": () => Promise<any>;
  /** Facebook is requesting a security checkpoint. Maps to FCA `checkpoint`. */
  "client:checkpoint": () => Promise<any>;
  /** A request was rate-limited by Facebook. Maps to FCA `rateLimit`. */
  "client:rate_limit": () => Promise<any>;
  /** A network-level error occurred. Maps to FCA `networkError`. */
  "client:network_error": () => Promise<any>;

  // ─── Friend ───────────────────────────────────────────────────────────────

  /** A friend request was received. Maps to FCA `friend_request_received`. */
  "friend:request": () => Promise<any>;
  /** A sent friend request was cancelled. Maps to FCA `friend_request_cancel`. */
  "friend:request_cancel": () => Promise<any>;
}

// ─── Middleware ───────────────────────────────────────────────────────────────

/** A middleware function for a specific Conduit event. */
export type Middleware<K extends keyof ConduitEvents> = (
  message: Parameters<ConduitEvents[K]>[0],
  next: () => Promise<void>,
) => Promise<void>;
