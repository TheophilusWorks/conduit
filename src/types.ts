import { MessengerBotOptions } from "@dongdev/fca-unofficial";
import { Readable } from "node:stream";
import { ConduitMessageBuilder } from "./builders/ConduitMessageBuilder.js";
import { ConduitMessageCollector } from "./utils/ConduitMessageCollector.js";

// ─── Primitives ───────────────────────────────────────────────────────────────

export type Loose = string & {};

// ─── Config & Credentials ─────────────────────────────────────────────────────

export interface ConduitClientConfig extends MessengerBotOptions {
  queue?: {
    messageQueue?: ConduitQueueConfig;
    threadQueue?: ConduitQueueConfig;
  };
  cache?: {
    cacheUsers: ConduitCacheConfig;
  };
}

export interface ConduitCredentials {
  appstate?: Loose[];
  cookies?: Loose;
  account?: {
    email: Loose;
    password: Loose;
  };
}

// ─── Attachments ──────────────────────────────────────────────────────────────

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

export interface AudioAttachment {
  type: "audio";
  ID: string;
  filename: string;
  audioType: string;
  duration: number;
  url: string;
  isVoiceMail: boolean;
}

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

export interface UnknownAttachment {
  type: string;
  ID: string;
  url?: string;
  filename?: string;
  [key: string]: any;
}

export type MessageAttachment =
  | PhotoAttachment
  | AudioAttachment
  | StickerAttachment
  | AnimatedImageAttachment
  | UnknownAttachment;

// ─── Shared Shapes ────────────────────────────────────────────────────────────

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

// ─── Collector Types ──────────────────────────────────────────────────────────

/**
 * Derives the payload type of a single ConduitEvents key.
 */
export type CollectorEventPayload<K extends keyof ConduitEvents> = Parameters<
  ConduitEvents[K]
>[0];

/**
 * Unions the payload types of all events in a readonly tuple.
 *
 * @example
 * ```ts
 * // T becomes MessageReactPayload | UserCreatePayload
 * type T = CollectorPayload<["message:react", "user:create"]>;
 * ```
 */
export type CollectorPayload<K extends readonly (keyof ConduitEvents)[]> =
  CollectorEventPayload<K[number]>;

/**
 * Shared configuration for message collectors and one-time await helpers.
 *
 * Generic over `K` — the tuple of Conduit events to subscribe to.
 * The `filter` callback and collected payload type are automatically
 * derived as a union of all event payloads in `K`.
 *
 * @example
 * ```ts
 * // default — T is MessageRespondPayload
 * sent.collect({ timeout: 30_000 });
 *
 * // custom — T is MessageReactPayload | UserCreatePayload
 * sent.collect({
 *   timeout: 30_000,
 *   events: ["message:react", "user:create"] as const,
 * });
 * ```
 */
export interface CollectorOptions<
  K extends readonly (keyof ConduitEvents)[] = ["message:respond"],
> {
  timeout?: number;
  max?: number;

  /**
   * Conduit events the collector subscribes to.
   * Defaults to `["message:respond"]` — only direct replies.
   */
  filter?: (message: CollectorPayload<K>) => boolean | Promise<boolean>;
}

/**
 * Reasons a collector may stop.
 */
export type CollectorEndReason = "timeout" | "limit" | "manual" | "fulfilled";

/**
 * Internal collected message map.
 */
export type CollectedMessages<T = unknown> = Map<string, T>;

/**
 * Event map for message collectors.
 */
export interface MessageCollectorEvents<T = unknown> {
  collect: (message: T) => Promise<any> | any;
  end: (
    collected: ReadonlyMap<string, T>,
    reason: CollectorEndReason,
  ) => Promise<any> | any;
}

/**
 * Stateful message collector used for streaming replies/messages.
 */
export interface MessageCollector<T = unknown> {
  readonly ended: boolean;
  readonly collected: ReadonlyMap<string, T>;
  stop(reason?: CollectorEndReason): void;
  on<K extends keyof MessageCollectorEvents<T>>(
    event: K,
    listener: MessageCollectorEvents<T>[K],
  ): this;
  once<K extends keyof MessageCollectorEvents<T>>(
    event: K,
    listener: MessageCollectorEvents<T>[K],
  ): this;
  off<K extends keyof MessageCollectorEvents<T>>(
    event: K,
    listener: MessageCollectorEvents<T>[K],
  ): this;
}

// ─── Sent Message ─────────────────────────────────────────────────────────────

export interface SentMessage {
  messageID: string;
  threadID: string;

  collect(
    options?: CollectorOptions<["message:respond"]>,
  ): ConduitMessageCollector<["message:respond"]>;
  collect<K extends readonly (keyof ConduitEvents)[]>(
    events: K,
    options?: CollectorOptions<K>,
  ): ConduitMessageCollector<K>;

  waitResponse(
    options?: Omit<CollectorOptions<["message:respond"]>, "max">,
  ): Promise<CollectorPayload<["message:respond"]>>;
  waitResponse<K extends readonly (keyof ConduitEvents)[]>(
    events: K,
    options?: Omit<CollectorOptions<K>, "max">,
  ): Promise<CollectorPayload<K>>;
}

// ─── Enrichment Mixins ────────────────────────────────────────────────────────

export type ConduitSendableBody =
  | string
  | ConduitMessageBody
  | ConduitMessageBuilder;

export interface Sendable {
  send(body: ConduitSendableBody): Promise<SentMessage>;
}

export interface Replyable extends Sendable {
  reply(body: ConduitSendableBody): Promise<SentMessage>;
  react(emoji: string): Promise<void>;

  collect(
    options?: CollectorOptions<["message:respond"]>,
  ): ConduitMessageCollector<["message:respond"]>;
  collect<K extends readonly (keyof ConduitEvents)[]>(
    events: K,
    options?: CollectorOptions<K>,
  ): ConduitMessageCollector<K>;

  waitResponse(
    options?: Omit<CollectorOptions<["message:respond"]>, "max">,
  ): Promise<CollectorPayload<["message:respond"]>>;
  waitResponse<K extends readonly (keyof ConduitEvents)[]>(
    events: K,
    options?: Omit<CollectorOptions<K>, "max">,
  ): Promise<CollectorPayload<K>>;
}

export interface EventPayload<K extends keyof ConduitEvents> {
  type: K;
}

// ─── Message Payloads ─────────────────────────────────────────────────────────

export interface MessageCreatePayload
  extends EventPayload<"message:create">,
    Message,
    Replyable {
  isGroup: boolean;
}

export interface MessageRespondPayload
  extends EventPayload<"message:respond">,
    Message,
    Replyable {
  isGroup: boolean;
  messageReply: Message;
}

export interface MessageRemovePayload
  extends EventPayload<"message:remove">,
    Sendable {
  threadID: string;
  messageID: string;
  senderID: string;
  deletionTimestamp: number;
}

export interface MessageReactPayload
  extends EventPayload<"message:react">,
    Sendable {
  threadID: string;
  messageID: string;
  senderID: string;
  reactorID: string;
  reaction: string;
}

export interface MessageWritingPayload
  extends EventPayload<"message:writing">,
    Sendable {
  threadID: string;
  senderID: string;
  isTyping: boolean;
}

export interface MessageReadPayload
  extends EventPayload<"message:read">,
    Sendable {
  threadID: string;
  readerID: string;
  time: string;
}

// ─── Thread Payloads ──────────────────────────────────────────────────────────

export interface ThreadEventBase {
  threadID: string;
  author: string;
  participantIDs: string[];
}

export interface ThreadUpdatePayload
  extends EventPayload<"thread:update">,
    ThreadEventBase,
    Sendable {
  logMessageType: string;
  logMessageData: Record<string, any>;
}

export interface ThreadTitleChangePayload
  extends EventPayload<"thread:title_change">,
    ThreadEventBase,
    Sendable {
  name: string;
}

export interface ThreadPhotoReplacedPayload
  extends EventPayload<"thread:photo_replaced">,
    ThreadEventBase,
    Sendable {
  image: {
    attachmentID: string;
    width: number;
    height: number;
    url: string;
  };
  timestamp: string;
}

export interface ThreadThemeChangedPayload
  extends EventPayload<"thread:theme_changed">,
    ThreadEventBase,
    Sendable {
  themeColor: string;
  gradient: string;
  themeID: string;
  accessibilityLabel: string;
  themeName: string;
  themeEmoji: string;
}

export interface ThreadNicknameChangedPayload
  extends EventPayload<"thread:nickname_changed">,
    ThreadEventBase,
    Sendable {
  participantID: string;
  nickname: string;
}

export interface ThreadAdminChangedPayload
  extends EventPayload<"thread:admin_changed">,
    ThreadEventBase,
    Sendable {
  targetID: string;
  adminEvent: "add_admin" | "remove_admin";
}

// ─── User Payloads ────────────────────────────────────────────────────────────

export interface AddedParticipant {
  fbid: string;
  fullName: string;
}

export interface UserCreatePayload
  extends EventPayload<"user:create">,
    ThreadEventBase,
    Sendable {
  addedParticipants: AddedParticipant[];
}

export interface UserRemovePayload
  extends EventPayload<"user:remove">,
    ThreadEventBase,
    Sendable {
  leftParticipantFbID: string;
}

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

// ─── Message Body ─────────────────────────────────────────────────────────────

export interface ConduitMessageBody {
  body?: string;
  attachment?: NodeJS.ReadableStream | NodeJS.ReadableStream[];
  url?: string;
  sticker?: string;
  emoji?: string;
  emojiSize?: "small" | "medium" | "large";
  mentions?: Array<{
    tag: string;
    id: string;
    fromIndex?: number;
  }>;
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export type Middleware<K extends keyof ConduitEvents> = (
  data: Parameters<ConduitEvents[K]> extends [infer First, ...any[]]
    ? First
    : never,
  next?: () => Promise<void>,
) => Promise<void>;

// ─── Queue ────────────────────────────────────────────────────────────────────

export type ConduitQueueJob<T> = () => Promise<T>;

export interface ConduitQueueConfig {
  minDelayMs: number;
  maxDelayMs: number;
  switchDelayMinMs?: number;
  switchDelayMaxMs?: number;
}

// ─── Builder ──────────────────────────────────────────────────────────────────

export type ConduitAttachmentInput = string | Buffer | Readable;

// ─── Cache ────────────────────────────────────────────────────────────────────

export interface ConduitCacheEntry<T> {
  data: T;
  expiresAt: number;
}

export interface ConduitCacheConfig {
  ttlInMS: number;
  cleanupIntervalInMS: number;
}

// ─── Collector ────────────────────────────────────────────────────────────────────

export interface CollectorOptions<
  K extends readonly (keyof ConduitEvents)[] = ["message:respond"],
> {
  timeout?: number;
  max?: number;
  filter?: (message: CollectorPayload<K>) => boolean | Promise<boolean>;
}
