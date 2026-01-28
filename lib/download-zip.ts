/**
 * Template Zip Download Utility
 *
 * Downloads template and preview files, packages them into a zip
 * using JSZip (pure JS, works in Expo Go), and shares the zip
 * file with the user via the system share sheet.
 *
 * @see /app/store/purchased.tsx - Usage in purchased templates screen
 */

import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import JSZip from "jszip";

/** Remove characters invalid for file/folder names */
function sanitizeName(name: string): string {
  return name.replace(/[<>:"/\\|?*]+/g, "").trim() || "template";
}

/** Get file extension from file type string, default to png */
function getExtension(fileType: string): string {
  const type = fileType.toLowerCase();
  const supported = ["png", "jpg", "jpeg", "gif", "webp", "svg", "pdf"];
  if (supported.includes(type)) return type;
  if (type.startsWith("image/")) return type.replace("image/", "");
  return "png";
}

/** Convert a base64 string to Uint8Array */
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Download a template and its preview, zip them, and share.
 *
 * Creates a zip with a folder named after the template containing:
 * - template.{ext} — the template file
 * - preview.{ext} — the preview image
 *
 * Then opens the share sheet so the user can save/send the zip.
 */
export async function downloadTemplateAsZip(opts: {
  name: string;
  downloadUrl: string;
  previewUrl: string;
  fileType: string;
}): Promise<void> {
  const folderName = sanitizeName(opts.name);
  const ext = getExtension(opts.fileType);

  const baseDir = new Directory(Paths.cache, "template-downloads");

  try {
    // Clean up previous artifacts
    if (baseDir.exists) {
      baseDir.delete();
    }
    baseDir.create();

    // Download both files in parallel
    const [templateFile, previewFile] = await Promise.all([
      File.downloadFileAsync(opts.downloadUrl, baseDir),
      File.downloadFileAsync(opts.previewUrl, baseDir),
    ]);

    // Read downloaded files as base64
    const templateBase64 = templateFile.base64Sync();
    const previewBase64 = previewFile.base64Sync();

    // Create zip with JSZip
    const zip = new JSZip();
    const folder = zip.folder(folderName)!;
    folder.file(`template.${ext}`, base64ToUint8Array(templateBase64));
    folder.file(`preview.${ext}`, base64ToUint8Array(previewBase64));

    // Generate zip as binary
    const zipData = await zip.generateAsync({ type: "uint8array" });

    // Write zip to cache
    const zipFile = new File(baseDir, `${folderName}.zip`);
    zipFile.write(zipData);

    // Share the zip file
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(zipFile.uri, {
        mimeType: "application/zip",
        dialogTitle: `Download ${folderName}`,
        UTI: "com.pkware.zip-archive",
      });
    }
  } finally {
    // Clean up temp files
    try {
      if (baseDir.exists) baseDir.delete();
    } catch {}
  }
}
