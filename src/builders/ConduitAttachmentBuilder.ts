import fs from "fs";
import path from "path";
import os from "os";
import { Readable } from "stream";
import { ConduitBaseBuilder } from "./ConduitBaseBuilder.js";
import { downloadFile } from "../utils/downloadFile.js";
import { ConduitAttachmentInput } from "../types.js";

/**
 * Builder for constructing attachment streams used in message uploads.
 *
 * Supports multiple input types:
 * - File path → streamed via `fs.createReadStream`
 * - URL → downloaded to temporary file then streamed
 * - Buffer → converted via `Readable.from`
 * - Readable → passed through directly
 *
 * @remarks
 * URL-based inputs are temporarily written to disk and automatically
 * deleted after streaming completes. This ensures memory efficiency
 * but introduces asynchronous cleanup behavior.
 */
export class ConduitAttachmentBuilder extends ConduitBaseBuilder<Readable[]> {
  constructor() {
    super([]);
  }

  /**
   * Adds an attachment source to the builder.
   *
   * @param input - File path, URL, Buffer, or Readable stream
   *
   * @remarks
   * URL inputs are downloaded asynchronously and streamed from a temporary file.
   */
  public from(input: ConduitAttachmentInput): this {
    if (input instanceof Readable) {
      this._data.push(input);
      return this;
    }

    if (Buffer.isBuffer(input)) {
      this._data.push(Readable.from(input));
      return this;
    }

    if (input.startsWith("http://") || input.startsWith("https://")) {
      this._data.push(this._streamFromURL(input));
      return this;
    }

    this._data.push(fs.createReadStream(input));
    return this;
  }

  /**
   * Downloads a remote file to a temporary location and streams it.
   *
   * @remarks
   * The temporary file is automatically removed once streaming completes.
   * Errors during download or streaming will destroy the stream.
   */
  private _streamFromURL(url: string): Readable {
    const ext = (() => {
      try {
        return path.extname(new URL(url).pathname) || ".bin";
      } catch {
        return ".bin";
      }
    })();

    const tmp = path.join(
      os.tmpdir(),
      `conduit_attach_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`,
    );

    const passthrough = new Readable({ read() {} });

    downloadFile(url, tmp)
      .then(() => {
        const stream = fs.createReadStream(tmp);
        stream.on("data", (chunk) => passthrough.push(chunk));
        stream.on("end", () => {
          passthrough.push(null);
          fs.unlink(tmp, () => {});
        });
        stream.on("error", (e) => passthrough.destroy(e));
      })
      .catch((e) => passthrough.destroy(e));

    return passthrough;
  }
}
