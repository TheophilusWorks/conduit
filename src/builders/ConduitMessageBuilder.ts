import { ConduitBaseBuilder } from "./ConduitBaseBuilder.js";
import { ConduitMessageBody } from "../types.js";
import { ConduitAttachmentBuilder } from "./ConduitAttachmentBuilder.js";

/**
 * Fluent builder for constructing message payloads in Conduit.
 *
 * Provides a chainable API for composing rich messages including:
 * text, mentions, attachments, stickers, emojis, and URLs.
 *
 * @remarks
 * This builder is converted internally into a `ConduitMessageBody`
 * before being sent through the Messages API.
 */
export class ConduitMessageBuilder extends ConduitBaseBuilder<ConduitMessageBody> {
  constructor() {
    super({
      mentions: [],
    } as ConduitMessageBody);
  }

  /**
   * Sets the message text content.
   *
   * @param text - Plain text body of the message
   *
   * @remarks
   * This is the primary content field. Mentions are rendered based on
   * offsets within this string.
   */
  body(text: string) {
    this._data.body = text;
    return this;
  }

  /**
   * Attaches a URL preview to the message.
   *
   * @param link - Fully qualified URL
   *
   * @remarks
   * The platform may render this as a link preview depending on client support.
   */
  url(link: string) {
    this._data.url = link;
    return this;
  }

  /**
   * Attaches one or more files to the message.
   *
   * @param file - Attachment source (builder, stream, or stream array)
   *
   * @remarks
   * If a `ConduitAttachmentBuilder` is provided, it will be resolved into
   * readable streams before sending.
   */
  attachment(
    file:
      | ConduitAttachmentBuilder
      | NodeJS.ReadableStream
      | NodeJS.ReadableStream[],
  ) {
    this._data.attachment =
      file instanceof ConduitAttachmentBuilder ? file.build() : file;
    return this;
  }

  /**
   * Sends a sticker using a Facebook sticker ID.
   *
   * @param id - Sticker identifier
   */
  sticker(id: string) {
    this._data.sticker = id;
    return this;
  }

  /**
   * Sends a large emoji message.
   *
   * @param value - Emoji character
   * @param size - Display size (small, medium, large)
   *
   * @remarks
   * Larger sizes may be rendered differently depending on client.
   */
  emoji(value: string, size: "small" | "medium" | "large" = "small") {
    this._data.emoji = value;
    this._data.emojiSize = size;
    return this;
  }

  /**
   * Adds a mention inside the message body.
   *
   * @param tag - Display text (e.g. "@john")
   * @param id - Target user ID
   * @param fromIndex - Starting index of the mention in the body string
   *
   * @remarks
   * Multiple mentions can be chained. Offsets must match the final body text.
   */
  mention(tag: string, id: string, fromIndex?: number) {
    this._data.mentions ??= [];
    this._data.mentions.push({
      tag,
      id,
      fromIndex,
    });
    return this;
  }
}
