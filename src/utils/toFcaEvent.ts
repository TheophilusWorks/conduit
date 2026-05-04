import { ConduitEvents } from "../types.js";

const FCA_EVENT_MAP = {
  "message:create": "message",
  "message:remove": "message_unsend",
  "message:edit": "message",
  "message:react": "message_reaction",
  "message:respond": "message_reply",
  "message:writing": "typ",
  "message:read": "read_receipt",

  "user:create": "event", // log:subscribe
  "user:presence": "presence",
  "user:remove": "event", // log:unsubscribe

  "thread:update": "event",
  "thread:title_change": "event", // log:thread-name
  "thread:photo_replaced": "event", // log:thread-image
  "thread:theme_changed": "event", // log:thread-color
  "thread:emoji_changed": "event", // log:thread-icon
  "thread:nickname_changed": "event", // log:user-nickname
  "thread:admin_changed": "event", // log:admin-text

  "client:ready": "ready",
  "client:session_expired": "sessionExpired",
  "client:checkpoint": "checkpoint",
  "client:rate_limit": "rateLimit",
  "client:network_error": "networkError",

  "friend:request": "friend_request_received",
  "friend:request_cancel": "friend_request_cancel",
} as const satisfies Record<keyof ConduitEvents, string>;

type FcaEventName = (typeof FCA_EVENT_MAP)[keyof typeof FCA_EVENT_MAP];

export function toFcaEvent(event: keyof ConduitEvents): FcaEventName {
  return FCA_EVENT_MAP[event];
}
