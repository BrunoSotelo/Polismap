/**
 * Compresses an image file using HTML5 Canvas.
 * @param file The original image file.
 * @param quality The quality of the output JPEG (0.0 to 1.0). Default is 0.7.
 * @param maxWidth The maximum width of the output image. Default is 1200px.
 * @returns A Promise that resolves to a Blob.
 */
export async function compressImage(file: File, quality = 0.7, maxWidth = 1200): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.src = URL.createObjectURL(file);
        image.onload = () => {
            const canvas = document.createElement('canvas');
            let width = image.width;
            let height = image.height;

            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                reject(new Error('Failed to get canvas context'));
                return;
            }

            ctx.drawImage(image, 0, 0, width, height);

            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Canvas to Blob conversion failed'));
                    }
                },
                'image/jpeg',
                quality
            );
        };
        image.onerror = (error) => reject(error);
    });
}

/**
 * Generates a clean filename for the INE image.
 * Format: [sanitized_name]_[timestamp].jpg
 */
export function generateIneFileName(name: string): string {
    const sanitized = name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_') // Replace non-alphanumeric with underscore
        .replace(/_+/g, '_'); // Collapse multiple underscores

    const timestamp = Date.now();
    return `${sanitized}_${timestamp}.jpg`;
}
