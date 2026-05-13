import axios from "axios";
import fs from "fs";

/**
 * Downloads a file from a URL and saves it to a local path.
 * @param url - The remote file URL.
 * @param dest - The local destination path.
 */
export async function downloadFile(url: string, dest: string): Promise<void> {
  const response = await axios.get(url, { responseType: "stream" });
  await new Promise<void>((resolve, reject) => {
    const writer = fs.createWriteStream(dest);
    response.data.pipe(writer);
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}
