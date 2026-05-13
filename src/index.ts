// ─── types ───────────────────────────────────────────────────────────────

export * from "./types.js";

// ─── client ───────────────────────────────────────────────────────────────
//
export { ConduitClient } from "./client/ConduitClient.js";

// ─── APIs ───────────────────────────────────────────────────────────────

export { ConduitAccountAPI } from "./api/ConduitAccountAPI.js";
export { ConduitMessagesAPI } from "./api/ConduitMessagesAPI.js";
export { ConduitThreadsAPI } from "./api/ConduitThreadsAPI.js";
export { ConduitUsersAPI } from "./api/ConduitUsersAPI.js";

// ─── utils ───────────────────────────────────────────────────────────────

export { ConduitAttachmentBuilder } from "./builders/ConduitAttachmentBuilder.js";
export { ConduitBaseBuilder } from "./builders/ConduitBaseBuilder.js";
export { ConduitMessageBuilder } from "./builders/ConduitMessageBuilder.js";

// ─── utils ───────────────────────────────────────────────────────────────

export { toFcaEvent } from "./utils/toFcaEvent.js";

// ─── error ───────────────────────────────────────────────────────────────

export { ConduitError } from "./errors/ConduitError.js";
