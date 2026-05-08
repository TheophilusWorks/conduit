import { ConduitEvents } from "../types.js";

const FCA_EVENT_MAP = {
  "message:create": "message",
  "message:remove": "message_unsend",
  "message:react": "message_reaction",
  "message:respond": "message_reply",
  "message:writing": "typ",
  "message:read": "read_receipt",

  "user:create": "event", // log:subscribe
  "user:remove": "event", // log:unsubscribe

  "thread:update": "event",
  "thread:title_change": "event", // log:thread-name
  "thread:photo_replaced": "event", // log:thread-image
  "thread:theme_changed": "event", // log:thread-color
  "thread:nickname_changed": "event", // log:user-nickname
  "thread:admin_changed": "event", // log:admin-text
} as const satisfies Record<keyof ConduitEvents, string>;

type FcaEventName = (typeof FCA_EVENT_MAP)[keyof typeof FCA_EVENT_MAP];

export function toFcaEvent(event: keyof ConduitEvents): FcaEventName {
  return FCA_EVENT_MAP[event];
}
