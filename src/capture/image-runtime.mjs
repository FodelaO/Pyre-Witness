/** Browser-native encoder shared by the app bundle and the standalone phone page. */

/** @param {number} width @param {number} height @param {number} longEdge */
export function fitToLongEdge(width, height, longEdge) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
    throw new Error("Image dimensions are unavailable.");
  }

  const scale = Math.min(1, longEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** @param {CanvasImageSource} source @param {number} width @param {number} height @param {number} quality */
function encodeJpeg(source, width, height, quality) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  try {
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Image processing is unavailable.");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, width, height);
    context.imageSmoothingQuality = "high";
    context.drawImage(source, 0, 0, width, height);

    const prefix = "data:image/jpeg;base64,";
    const encoded = canvas.toDataURL("image/jpeg", quality);
    if (!encoded.startsWith(prefix)) throw new Error("Could not create a JPEG.");
    return { mimeType: "image/jpeg", dataBase64: encoded.slice(prefix.length) };
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}

/** @param {File | HTMLVideoElement} source @param {number} longEdge @param {number} quality */
export async function prepareImage(source, longEdge, quality) {
  if (source instanceof HTMLVideoElement) {
    const size = fitToLongEdge(source.videoWidth, source.videoHeight, longEdge);
    return encodeJpeg(source, size.width, size.height, quality);
  }

  const objectUrl = URL.createObjectURL(source);
  try {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = () => resolve(undefined);
      image.onerror = () => reject(new Error("Could not open this image."));
      image.src = objectUrl;
    });
    const size = fitToLongEdge(image.naturalWidth, image.naturalHeight, longEdge);
    return encodeJpeg(image, size.width, size.height, quality);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
