import { MessengerBotOptions } from "@dongdev/fca-unofficial";
import { Readable } from "node:stream";
import { ConduitMessageBuilder } from "./builders/ConduitMessageBuilder.js";

// ─── Primitives ───────────────────────────────────────────────────────────────

/**
 * A loose string type that preserves IDE autocomplete for literal unions
 * while still behaving as a normal string at runtime.
 *
 * This is useful for configuration or credential fields where values are
 * technically strings but benefit from inferred literal suggestions.
 */
export type Loose = string & {};

// ─── Config & Credentials ─────────────────────────────────────────────────────

/**
 * Configuration options for the Conduit client.
 *
 * Extends the underlying Messenger bot options and adds optional queue
 * configuration for message and thread-level execution control.
 *
 * @see MessengerBotOptions
 */
export interface ConduitClientConfig extends MessengerBotOptions {
  queue?: {
    /** Configuration for message send/reply queueing behavior. */
    messageQueue?: ConduitQueueConfig;
    /** Configuration for thread-level queued operations. */
    threadQueue?: ConduitQueueConfig;
  };

  cache: {
    cacheUsers: ConduitCacheConfig;
  };
}

/**
 * Authentication credentials for the Conduit client.
 *
 * Only one authentication strategy should be used per session.
 *
 * Recommended order:
 * 1. appstate (most stable and recommended)
 * 2. cookies (manual session reuse)
 * 3. account (email/password fallback, least stable)
 */
export interface ConduitCredentials {
  /** Appstate cookies exported from a browser session. Preferred method. */
  appstate?: Loose[];

  /** Raw cookie header string from a logged-in session. */
  cookies?: Loose;

  /** Email/password login credentials (less stable, may trigger checkpoints). */
  account?: {
    email: Loose;
    password: Loose;
  };
}

// ─── Attachments ──────────────────────────────────────────────────────────────

/**
 * Photo attachment object returned by the underlying FCA layer.
 */
export interface PhotoAttachment {
  type: "photo";
  ID: string;
  filename: string;
  thumbnailUrl: string;
  previewUrl: string;
  previewWidth: number;
  previewHeight: number;
  largePreviewUrl: string;
  largePreviewWidth: number;
  largePreviewHeight: number;
  url: string;
  width: number;
  height: number;
  name: string;
}

/**
 * Audio attachment (voice message or audio file).
 */
export interface AudioAttachment {
  type: "audio";
  ID: string;
  filename: string;
  audioType: string;
  duration: number;
  url: string;
  isVoiceMail: boolean;
}

/**
 * Sticker attachment with metadata for rendering animated or static stickers.
 */
export interface StickerAttachment {
  type: "sticker";
  ID: string;
  url: string;
  packID: string;
  spriteUrl: string | null;
  spriteUrl2x: string | null;
  width: number;
  height: number;
  caption: string;
  description: string;
  frameCount: number;
  frameRate: number;
  framesPerRow: number;
  framesPerCol: number;
  stickerID: string;
  spriteURI: string | null;
  spriteURI2x: string | null;
}

/**
 * Animated image or GIF attachment with multiple rendering formats.
 */
export interface AnimatedImageAttachment {
  type: "animated_image";
  ID: string;
  filename: string;
  previewUrl: string;
  previewWidth: number;
  previewHeight: number;
  url: string;
  width: number;
  height: number;
  thumbnailUrl: string;
  name: string;
  facebookUrl: string;
  rawGifImage: string;
  animatedGifUrl: string;
  animatedGifPreviewUrl: string;
  animatedWebpUrl: string;
  animatedWebpPreviewUrl: string;
}

/**
 * Fallback attachment type for unsupported or unknown FCA attachments.
 *
 * This is used when the attachment type is not explicitly mapped in Conduit.
 */
export interface UnknownAttachment {
  type: string;
  ID: string;
  url?: string;
  filename?: string;
  [key: string]: any;
}

/**
 * Union of all supported message attachment types.
 */
export type MessageAttachment =
  | PhotoAttachment
  | AudioAttachment
  | StickerAttachment
  | AnimatedImageAttachment
  | UnknownAttachment;

// ─── Shared Shapes ────────────────────────────────────────────────────────────

/**
 * Core message structure shared across all message-related events.
 *
 * Represents the normalized message payload used internally by Conduit.
 */
export interface Message {
  threadID: string;
  messageID: string;
  senderID: string;
  body: string;
  attachments: MessageAttachment[];
  mentions: Record<string, string>;
  timestamp: string;
  participantIDs: string[];
}

/**
 * Base structure shared by all thread-related events.
 */
export interface ThreadEventBase {
  threadID: string;

  /** User who triggered the event. */
  author: string;

  participantIDs: string[];
}

// ─── Enrichment Mixins ────────────────────────────────────────────────────────

export type ConduitSendableBody =
  | string
  | ConduitMessageBody
  | ConduitMessageBuilder;

/**
 * Provides the ability to send a message to the current thread.
 *
 * This helper is injected into all Conduit event payloads.
 */
export interface Sendable {
  /** Sends a message to the originating thread. */
  send(body: ConduitSendableBody): Promise<void>;
}

/**
 * Extended capabilities available only on message-related events.
 *
 * Includes replying to and reacting to a specific message.
 */
export interface Replyable extends Sendable {
  /** Replies directly to the message that triggered the event. */
  reply(body: ConduitSendableBody): Promise<void>;

  /** Adds or removes a reaction on the message. */
  react(emoji: string): Promise<void>;
}

// ─── Message Payloads ─────────────────────────────────────────────────────────

/**
 * Emitted when a new message is created.
 *
 * Note: some fields from FCA are inconsistent across event types.
 *
 * @remarks
 * Timestamp format differs depending on event source.
 */
export interface MessageCreatePayload extends Message, Replyable {
  isGroup: boolean;
}

/**
 * Emitted when a message is a reply to another message.
 */
export interface MessageRespondPayload extends Message, Replyable {
  isGroup: boolean;

  /** The original message being replied to. */
  messageReply: Message;
}

/**
 * Emitted when a message is removed or unsent.
 */
export interface MessageRemovePayload extends Sendable {
  threadID: string;
  messageID: string;
  senderID: string;
  deletionTimestamp: number;
}

/**
 * Emitted when a reaction is added or removed.
 */
export interface MessageReactPayload extends Sendable {
  threadID: string;
  messageID: string;
  senderID: string;
  reactorID: string;
  reaction: string;
}

/**
 * Emitted when a user starts or stops typing.
 */
export interface MessageWritingPayload extends Sendable {
  threadID: string;
  senderID: string;
  isTyping: boolean;
}

/**
 * Emitted when a message is marked as read.
 */
export interface MessageReadPayload extends Sendable {
  threadID: string;
  readerID: string;
  time: string;
}

// ─── Thread Payloads ──────────────────────────────────────────────────────────

/**
 * Raw thread update event emitted by FCA before fan-out processing.
 */
export interface ThreadUpdatePayload extends ThreadEventBase, Sendable {
  logMessageType: string;
  logMessageData: Record<string, any>;
}

/**
 * Emitted when a thread title is changed.
 */
export interface ThreadTitleChangePayload extends ThreadEventBase, Sendable {
  name: string;
}

/**
 * Emitted when a thread photo is replaced.
 */
export interface ThreadPhotoReplacedPayload extends ThreadEventBase, Sendable {
  image: {
    attachmentID: string;
    width: number;
    height: number;
    url: string;
  };
  timestamp: string;
}

/**
 * Emitted when thread theme or color changes.
 */
export interface ThreadThemeChangedPayload extends ThreadEventBase, Sendable {
  themeColor: string;
  gradient: string;
  themeID: string;
  accessibilityLabel: string;
  themeName: string;
  themeEmoji: string;
}

/**
 * Emitted when a participant nickname is changed.
 */
export interface ThreadNicknameChangedPayload
  extends ThreadEventBase,
    Sendable {
  participantID: string;
  nickname: string;
}

/**
 * Emitted when admin status changes for a participant.
 */
export interface ThreadAdminChangedPayload extends ThreadEventBase, Sendable {
  targetID: string;
  adminEvent: "add_admin" | "remove_admin";
}

// ─── User Payloads ────────────────────────────────────────────────────────────

/**
 * Participant added to a group thread.
 */
export interface AddedParticipant {
  fbid: string;
  fullName: string;
}

/**
 * User joined a group thread.
 */
export interface UserCreatePayload extends ThreadEventBase, Sendable {
  addedParticipants: AddedParticipant[];
}

/**
 * User left or was removed from a group thread.
 */
export interface UserRemovePayload extends ThreadEventBase, Sendable {
  leftParticipantFbID: string;
}

/**
 * User info fetched via user ID
 */
export interface UserInfo {
  name: string;
  firstName: string;
  vanity: string;
  thumbSrc: string;
  profileUrl: string;
  gender: 1 | 2;
  type: "user";
  isFriend: boolean;
  isBirthDay: boolean;
  searchTokens: string[];
}

export type UserInfoResponse = Record<string, UserInfo>;

// ─── Events ───────────────────────────────────────────────────────────────────

/**
 * Full event map emitted by Conduit.
 *
 * Each event corresponds to a normalized wrapper over FCA raw events.
 */
export interface ConduitEvents {
  "message:create": (data: MessageCreatePayload) => Promise<any>;
  "message:remove": (data: MessageRemovePayload) => Promise<any>;
  "message:react": (data: MessageReactPayload) => Promise<any>;
  "message:respond": (data: MessageRespondPayload) => Promise<any>;
  "message:writing": (data: MessageWritingPayload) => Promise<any>;
  "message:read": (data: MessageReadPayload) => Promise<any>;

  "user:create": (data: UserCreatePayload) => Promise<any>;
  "user:remove": (data: UserRemovePayload) => Promise<any>;

  "thread:update": (data: ThreadUpdatePayload) => Promise<any>;
  "thread:title_change": (data: ThreadTitleChangePayload) => Promise<any>;
  "thread:photo_replaced": (data: ThreadPhotoReplacedPayload) => Promise<any>;
  "thread:theme_changed": (data: ThreadThemeChangedPayload) => Promise<any>;
  "thread:nickname_changed": (
    data: ThreadNicknameChangedPayload,
  ) => Promise<any>;
  "thread:admin_changed": (data: ThreadAdminChangedPayload) => Promise<any>;
}

/**
 * Message body structure used when sending content through the API.
 */
export interface ConduitMessageBody {
  body?: string;
  attachment?: NodeJS.ReadableStream | NodeJS.ReadableStream[];
  url?: string;
  sticker?: string;
  emoji?: string;
  emojiSize?: "small" | "medium" | "large";

  /**
   * Mention metadata used for tagging users inside message bodies.
   */
  mentions?: Array<{
    tag: string;
    id: string;
    fromIndex?: number;
  }>;
}

// ─── Middleware ───────────────────────────────────────────────────────────────

/**
 * Middleware handler for Conduit events.
 */
export type Middleware<K extends keyof ConduitEvents> = (
  data: Parameters<ConduitEvents[K]> extends [infer First, ...any[]]
    ? First
    : never,
  next?: () => Promise<void>,
) => Promise<void>;

// ─── Queue ───────────────────────────────────────────────────────────────────

/**
 * A queued async job executed per thread.
 */
export type ConduitQueueJob<T> = () => Promise<T>;

/**
 * Configuration for message/thread queue timing behavior.
 */
export interface ConduitQueueConfig {
  minDelayMs: number;
  maxDelayMs: number;
  switchDelayMinMs?: number;
  switchDelayMaxMs?: number;
}

// ─── Builder ───────────────────────────────────────────────────────────────
/**
 * Input type for attachment builders.
 */
export type ConduitAttachmentInput = string | Buffer | Readable;

// ─── Cache ───────────────────────────────────────────────────────────────

/**
 * The stored value wrapper in the cache map
 */
export interface ConduitCacheEntry<T> {
  data: T;
  expiresAt: number;
}

/**
 * Constructor argument in cache
 */
export interface ConduitCacheConfig {
  ttlInMS: number;
  cleanupIntervalInMS: number;
}
