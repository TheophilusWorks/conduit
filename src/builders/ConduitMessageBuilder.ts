import { ConduitBaseBuilder } from "./ConduitBaseBuilder.js";
import { ConduitMessageBody } from "../types.js";
import { ConduitAttachmentBuilder } from "./ConduitAttachmentBuilder.js";

export class ConduitMessageBuilder extends ConduitBaseBuilder<ConduitMessageBody> {
  constructor() {
    super({
      mentions: [],
    } as ConduitMessageBody);
  }

  /**
   * Sets the text body of the message.
   * @param text - The message text content.
   */
  body(text: string) {
    this._data.body = text;
    return this;
  }

  /**
   * Attaches a URL to the message.
   * @param link - The URL to include.
   */
  url(link: string) {
    this._data.url = link;
    return this;
  }

  /**
   * Attaches one or more file streams to the message.
   * Use {@link ConduitAttachmentBuilder} to build streams from paths, URLs, or buffers.
   * @param file - A ConduitAttachmentBuilder, a readable stream or array of readable streams.
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
   * Sends a sticker by its Facebook sticker ID.
   * @param id - The sticker ID.
   */
  sticker(id: string) {
    this._data.sticker = id;
    return this;
  }

  /**
   * Sends a large emoji message.
   * @param value - The emoji character.
   * @param size - The display size. Defaults to `"small"`.
   */
  emoji(value: string, size: "small" | "medium" | "large" = "small") {
    this._data.emoji = value;
    this._data.emojiSize = size;
    return this;
  }

  /**
   * Adds a mention to the message.
   * Multiple mentions can be chained.
   * @param tag - The display tag string (e.g. `"@username"`).
   * @param id - The Facebook user ID of the mentioned user.
   * @param fromIndex - The character index in the body where the tag starts.
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
