"use client";

/**
 * imageSpec — the product-photo dimension contract, enforced at upload time.
 *
 * WHY THIS EXISTS
 * Every storefront slot that renders a product photo is a FIXED 2:3 portrait
 * box with `object-cover`:
 *
 *   ProductCard (mobile)          176 × 264
 *   ProductCard (desktop)         326 × 489
 *   AddToCartDrawer (desktop)     326 × 489
 *   Product page (mobile)         361 × 541
 *   Product page (desktop hero)   508 × 761
 *
 * `object-cover` never distorts — it CROPS. So an off-ratio upload doesn't
 * break the layout, it silently eats the picture: a 3:4 studio shot loses ~11%
 * of its height on every card, which is exactly where a model's head or a
 * garment's hem lives. And an undersized upload is stretched past its native
 * resolution in the 508 × 761 hero (1016 × 1522 on a 2× display), which reads
 * as "blurry product photo" with nothing in the UI explaining why.
 *
 * Neither failure raises an error anywhere, which is why the gate has to sit at
 * the upload boundary rather than being left to reviewers' eyes.
 *
 * THE TARGET: 998 × 1498 — 2:3 portrait, and large enough that the biggest
 * storefront slot never upscales.
 *
 * Accepted = the same shape within RATIO_TOLERANCE, at least TARGET_WIDTH wide.
 * Bigger is fine (next/image downscales); the 4 MB UploadThing cap is the
 * upper bound and is enforced separately by the upload route.
 *
 * NOTE ON THE MINIMUM: only WIDTH is checked. A mathematically exact 2:3 image
 * 998px wide is 998 × 1497 — a strict `height >= 1498` would reject the very
 * shape this module asks for. The ratio check already pins the height.
 */

export const PRODUCT_IMAGE_WIDTH = 998;
export const PRODUCT_IMAGE_HEIGHT = 1498;

/** 0.6662 — a hair under a true 2:3 (0.6667), which the tolerance absorbs. */
export const PRODUCT_IMAGE_RATIO = PRODUCT_IMAGE_WIDTH / PRODUCT_IMAGE_HEIGHT;

/**
 * ±3% on width/height. Admits a true 2:3 and the near-2:3 crops phone cameras
 * and stock libraries produce; rejects 3:4 (0.75), 4:5 (0.80), square, and
 * anything landscape.
 */
export const PRODUCT_IMAGE_RATIO_TOLERANCE = 0.03;

/** Human-facing spec string. Single source for every label + error message. */
export const PRODUCT_IMAGE_SPEC_LABEL = `${PRODUCT_IMAGE_WIDTH} × ${PRODUCT_IMAGE_HEIGHT}`;

/** Reads intrinsic pixel dimensions without uploading. Browser-only. */
export function readImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const dims = { width: img.naturalWidth, height: img.naturalHeight };
      URL.revokeObjectURL(url);
      // A decodable-but-zero-sized image is a corrupt file, not a valid 0×0.
      if (!dims.width || !dims.height) reject(new Error("empty image"));
      else resolve(dims);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("not a readable image"));
    };
    img.src = url;
  });
}

/**
 * Validate one file against the product-photo spec.
 * Resolves to `{ ok, name, width, height, reason }` — never throws, so a bad
 * file in a multi-select batch can be reported rather than aborting the batch.
 */
export async function validateProductImage(file) {
  const name = file?.name || "image";

  if (!file?.type || !file.type.startsWith("image/")) {
    return { ok: false, name, width: 0, height: 0, reason: "is not an image file" };
  }

  let dims;
  try {
    dims = await readImageDimensions(file);
  } catch {
    return { ok: false, name, width: 0, height: 0, reason: "could not be read as an image" };
  }

  const { width, height } = dims;
  const actual = `${width} × ${height}`;
  const ratio = width / height;
  const drift = Math.abs(ratio - PRODUCT_IMAGE_RATIO) / PRODUCT_IMAGE_RATIO;

  if (drift > PRODUCT_IMAGE_RATIO_TOLERANCE) {
    return {
      ok: false,
      name,
      width,
      height,
      reason: `is ${actual} — the storefront crops to a 2:3 portrait, so it needs the same shape as ${PRODUCT_IMAGE_SPEC_LABEL}`,
    };
  }

  if (width < PRODUCT_IMAGE_WIDTH) {
    return {
      ok: false,
      name,
      width,
      height,
      reason: `is ${actual} — too small, it would look blurry on the product page. Use at least ${PRODUCT_IMAGE_SPEC_LABEL}`,
    };
  }

  return { ok: true, name, width, height, reason: "" };
}

/** Validate a FileList / array. Returns the passing files + rejection notices. */
export async function validateProductImages(files) {
  const list = Array.from(files || []);
  const results = await Promise.all(list.map((f) => validateProductImage(f)));
  const accepted = list.filter((_, i) => results[i].ok);
  const rejected = results.filter((r) => !r.ok);
  return { accepted, rejected };
}

/** One sentence naming every rejected file and why. "" when nothing failed. */
export function describeRejections(rejected) {
  if (!rejected || rejected.length === 0) return "";
  return `${rejected.map((r) => `"${r.name}" ${r.reason}`).join("; ")}.`;
}
