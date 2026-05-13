import { ConduitEvents } from "../types.js";

/**
 * Maps Conduit’s high-level event system to raw FCA event names.
 *
 * This acts as a translation layer between:
 * - Conduit events (typed, stable API surface)
 * - FCA events (raw, unstable implementation layer)
 *
 * @remarks
 * Multiple Conduit events may map to the same FCA event source.
 * For example, most thread and user updates are emitted through
 * the generic `"event"` FCA channel and differentiated later via payload data.
 */
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

/**
 * Union of all raw FCA event names derived from the mapping table.
 *
 * @remarks
 * This type ensures that `toFcaEvent()` can only return valid FCA event identifiers.
 */
type FcaEventName = (typeof FCA_EVENT_MAP)[keyof typeof FCA_EVENT_MAP];

/**
 * Converts a Conduit event name into its corresponding FCA event identifier.
 *
 * @param event - High-level Conduit event (typed API surface)
 * @returns Raw FCA event name used internally by the Messenger bot
 *
 * @remarks
 * This function is part of Conduit’s internal event translation layer.
 * It should not be used directly unless working on low-level integrations.
 *
 * @example
 * ```ts
 * toFcaEvent("message:create"); // "message"
 * toFcaEvent("message:remove"); // "message_unsend"
 * ```
 */
export function toFcaEvent(event: keyof ConduitEvents): FcaEventName {
  return FCA_EVENT_MAP[event];
}
