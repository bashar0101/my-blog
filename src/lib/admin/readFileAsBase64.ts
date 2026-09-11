const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_PDF_BYTES = 10 * 1024 * 1024;

export function validateImage(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) return "Choose a JPEG, PNG, or WebP image.";
  if (file.size > MAX_IMAGE_BYTES) return "Image must be 5 MB or smaller.";
  return null;
}

/**
 * A CV is published for download, so the type is checked rather than trusted
 * from the extension: a .pdf that is really something else would be committed
 * to the repository and served to every visitor.
 *
 * Browsers report an empty type for a file they cannot identify, which is
 * treated as "not a PDF" rather than waved through.
 */
export function validatePdf(file: File): string | null {
  if (file.type !== "application/pdf") return "Choose a PDF file.";
  if (file.size > MAX_PDF_BYTES) return "PDF must be 10 MB or smaller.";
  return null;
}

export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The file could not be read."));
    reader.onload = () => {
      const value = String(reader.result);
      const comma = value.indexOf(",");
      resolve(comma === -1 ? value : value.slice(comma + 1));
    };
    reader.readAsDataURL(file);
  });
}
