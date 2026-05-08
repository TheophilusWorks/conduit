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
  timestamp: string;
  participantIDs: string[];
}

/**
 * Base shape shared across all thread events fanned out from FCA `threadUpdate`.
 * All thread sub-events include at minimum these fields.
 */
export interface ThreadEventBase {
  threadID: string;
  /** The user who performed the action. */
  author: string;
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

/** Emitted when a message is unsent by its sender. Maps to FCA `message_unsend`. */
export interface MessageRemovePayload {
  threadID: string;
  messageID: string;
  senderID: string;
  deletionTimestamp: number;
}

/** Emitted when a reaction is added or removed on a message. Maps to FCA `message_reaction`. */
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

// ─── Thread Payloads ─────────────────────────────────────────────────────────

/**
 * Emitted on any thread metadata change. Catch-all for the raw FCA `threadUpdate` event.
 * For specific changes, prefer the narrower `thread:*` events.
 */
export interface ThreadUpdatePayload extends ThreadEventBase {
  logMessageType: string;
  logMessageData: Record<string, any>;
}

/** Emitted when the group thread title is changed. Maps to FCA `threadUpdate` → `log:thread-name`. */
export interface ThreadTitleChangePayload extends ThreadEventBase {
  /** The new thread title. */
  name: string;
}

/** Emitted when the group photo is changed. Maps to FCA `threadUpdate` → `log:thread-image`. */
export interface ThreadPhotoReplacedPayload extends ThreadEventBase {
  image: {
    attachmentID: string;
    width: number;
    height: number;
    url: string;
  };
  timestamp: string;
}

/** Emitted when the chat theme or color is changed. Maps to FCA `threadUpdate` → `log:thread-color`. */
export interface ThreadThemeChangedPayload extends ThreadEventBase {
  themeColor: string;
  gradient: string;
  themeID: string;
  accessibilityLabel: string;
  themeName: string;
  themeEmoji: string;
}

/** Emitted when a participant's nickname is changed. Maps to FCA `threadUpdate` → `log:user-nickname`. */
export interface ThreadNicknameChangedPayload extends ThreadEventBase {
  /** The participant whose nickname was changed. */
  participantID: string;
  /** The new nickname. Empty string if cleared. */
  nickname: string;
}

/** Emitted when a participant's admin status is changed. Maps to FCA `threadUpdate` → `log:thread-admins`. */
export interface ThreadAdminChangedPayload extends ThreadEventBase {
  /** The participant whose admin status changed. */
  targetID: string;
  /** Whether the participant was promoted or demoted. */
  adminEvent: "add_admin" | "remove_admin";
}

// ─── User Payloads ────────────────────────────────────────────────────────────

/** A participant added to a group thread. */
export interface AddedParticipant {
  fbid: string;
  fullName: string;
}

/** Emitted when a user is added to a group thread. Maps to FCA `threadUpdate` → `log:subscribe`. */
export interface UserCreatePayload extends ThreadEventBase {
  addedParticipants: AddedParticipant[];
}

/** Emitted when a user is removed from or leaves a group thread. Maps to FCA `threadUpdate` → `log:unsubscribe`. */
export interface UserRemovePayload extends ThreadEventBase {
  /** The fbid of the participant who left or was removed. */
  leftParticipantFbID: string;
}

// ─── Events ───────────────────────────────────────────────────────────────────

/**
 * All events emitted by the Conduit event bus.
 *
 * Thread sub-events (join, leave, title change, etc.) arrive as `threadUpdate` from
 * FCA with a `logMessageType` discriminant — Conduit fans those out into the
 * specific `thread:*` and `user:*` events below.
 *
 * @see https://github.com/dongp06/fca-unofficial — Section 15: Events Reference
 */
export interface ConduitEvents {
  // ─── Message ──────────────────────────────────────────────────────────────

  /** A new message was received. Maps to FCA `message`. */
  "message:create": (data: MessageCreatePayload) => Promise<any>;
  /** A message was unsent by its sender. Maps to FCA `message_unsend`. */
  "message:remove": (data: MessageRemovePayload) => Promise<any>;
  /** A reaction was added or removed on a message. Maps to FCA `message_reaction`. */
  "message:react": (data: MessageReactPayload) => Promise<any>;
  /** A reply was sent to an existing message. Maps to FCA `message_reply`. */
  "message:respond": (data: MessageRespondPayload) => Promise<any>;
  /** A user started or stopped typing. Maps to FCA `typ`. Requires `listenTyping: true`. */
  "message:writing": (data: MessageWritingPayload) => Promise<any>;
  /** A thread or message was marked as read. Maps to FCA `read_receipt`. */
  "message:read": (data: MessageReadPayload) => Promise<any>;

  // ─── User ─────────────────────────────────────────────────────────────────

  /** A user was added to a group thread. Maps to FCA `threadUpdate` → `log:subscribe`. */
  "user:create": (data: UserCreatePayload) => Promise<any>;
  /** A user was removed from or left a group thread. Maps to FCA `threadUpdate` → `log:unsubscribe`. */
  "user:remove": (data: UserRemovePayload) => Promise<any>;

  // ─── Thread ───────────────────────────────────────────────────────────────

  /** Thread metadata changed (catch-all). Maps to raw FCA `threadUpdate`. */
  "thread:update": (data: ThreadUpdatePayload) => Promise<any>;
  /** The thread title was changed. Maps to FCA `threadUpdate` → `log:thread-name`. */
  "thread:title_change": (data: ThreadTitleChangePayload) => Promise<any>;
  /** The thread photo was changed. Maps to FCA `threadUpdate` → `log:thread-image`. */
  "thread:photo_replaced": (data: ThreadPhotoReplacedPayload) => Promise<any>;
  /** The thread theme/color was changed. Maps to FCA `threadUpdate` → `log:thread-color`. */
  "thread:theme_changed": (data: ThreadThemeChangedPayload) => Promise<any>;
  /** A participant's nickname was changed. Maps to FCA `threadUpdate` → `log:user-nickname`. */
  "thread:nickname_changed": (
    data: ThreadNicknameChangedPayload,
  ) => Promise<any>;
  /** A participant's admin status was changed. Maps to FCA `threadUpdate` → `log:thread-admins`. */
  "thread:admin_changed": (data: ThreadAdminChangedPayload) => Promise<any>;
}

// ─── Middleware ───────────────────────────────────────────────────────────────

/** A middleware function for a specific Conduit event. */
export type Middleware<K extends keyof ConduitEvents> = (
  data: Parameters<ConduitEvents[K]> extends [infer First, ...any[]]
    ? First
    : never,
  next: () => Promise<void>,
) => Promise<void>;
