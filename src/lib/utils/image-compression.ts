/**
 * Client-side image compression and resizing utility using HTML5 Canvas.
 * Compresses images before upload to save bandwidth and storage.
 */

export interface CompressionOptions {
  maxDimension?: number;
  quality?: number; // 0.1 to 1.0
  maxSizeMB?: number;
}

export async function compressImageClientSide(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  // If it's a PDF, we cannot compress via canvas, return as-is
  if (file.type === "application/pdf") {
    return file;
  }

  // If not an image, return as-is
  if (!file.type.startsWith("image/")) {
    return file;
  }

  const { maxDimension = 2048, quality = 0.82 } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image for compression"));
      img.onload = () => {
        let { width, height } = img;

        // Resize proportionally if dimensions exceed maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return resolve(file); // Fallback to original
        }

        // Fill white background in case of transparent PNGs converted to JPEG
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to webp or jpeg
        const targetType = "image/jpeg";
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve(file);
            }
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
              type: targetType,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          targetType,
          quality
        );
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}

