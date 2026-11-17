// ============================================================
// Getting a photo ready to send, in the browser, before upload.
//
// An iPhone's camera roll holds HEIC pictures. The moderation
// check cannot look at HEIC, and a picture it cannot check is not
// delivered. So a HEIC picture is turned into a JPEG here, on the
// student's own device, the moment it is chosen: the browser that
// can open a HEIC (Safari, where they come from) draws it and
// saves it again as JPEG. Large photos are made smaller the same
// way, so they upload and are checked quickly.
//
// A browser that cannot open the picture says so plainly.
// ============================================================

/** The longest side a sent photo keeps. Plenty to read handwriting. */
export const MAX_SIDE = 2048;
/** Photos over this many bytes are made smaller even when they are already JPEG or PNG. */
const BIG = 1.5 * 1024 * 1024;

export const PHOTO_ERROR =
  "That photo couldn't be opened here. Try taking a screenshot of it and sending that.";

const HEIC = /^image\/hei[cf]$/i;
const HEIC_NAME = /\.hei[cf]$/i;
/** GIFs are left as they are: redrawing one would keep only its first frame. */
const LEAVE = /^image\/gif$/i;

export const isHeic = (file: { type: string; name: string }): boolean =>
  HEIC.test(file.type) || (file.type === "" && HEIC_NAME.test(file.name));

/** Whether a chosen file is redrawn as a JPEG before it is uploaded. */
export function needsRedraw(file: { type: string; name: string; size: number }): boolean {
  if (isHeic(file)) return true;
  if (LEAVE.test(file.type)) return false;
  return file.size > BIG;
}

/** A width and height scaled to fit inside MAX_SIDE, never enlarged. */
export function fitWithin(width: number, height: number, max = MAX_SIDE) {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** The photo as it should be uploaded: itself, or a JPEG redrawn from it. Throws an Error whose
 *  message is PHOTO_ERROR when the browser cannot open it. */
export async function preparePhoto(file: File): Promise<File> {
  if (!needsRedraw(file)) return file;
  let bitmap: ImageBitmap;
  try {
    // "from-image" keeps a phone photo the right way up
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error(PHOTO_ERROR);
  }
  const { width, height } = fitWithin(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error(PHOTO_ERROR);
  // a white ground, so a see-through PNG does not come out black
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, "image/jpeg", 0.86));
  if (!blob) throw new Error(PHOTO_ERROR);
  const name = file.name.replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${name}.jpg`, { type: "image/jpeg" });
}
