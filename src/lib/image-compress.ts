import sharp from 'sharp';

// Compress image to fit within Edge Config's size limit
// while preserving as much quality as possible
// Edge Config has ~2MB limit per key, so we compress just enough to fit
export async function compressImage(base64Data: string): Promise<{ data: string; contentType: string }> {
  try {
    // Extract the base64 data from data URL
    const matches = base64Data.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!matches) {
      return { data: base64Data, contentType: 'image/jpeg' };
    }

    const buffer = Buffer.from(matches[2], 'base64');

    // Get image metadata to determine compression level
    const metadata = await sharp(buffer).metadata();
    const originalSize = buffer.length;

    // Only compress if image is larger than 1MB
    // Images under 1MB are stored as-is (no quality loss)
    if (originalSize < 1024 * 1024) {
      return { data: base64Data, contentType: matches[1] };
    }

    // For larger images, compress progressively until under 1.5MB
    // This preserves maximum quality while fitting in Edge Config
    let quality = 90;
    let maxDimension = Math.max(metadata.width || 1920, metadata.height || 1920);

    // Cap dimension at 1920px (full HD) - no aggressive downscaling
    if (maxDimension > 1920) {
      maxDimension = 1920;
    }

    let compressed = await sharp(buffer)
      .resize(maxDimension, maxDimension, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();

    // If still too large, reduce quality gradually (not dimension)
    while (compressed.length > 1500 * 1024 && quality > 40) {
      quality -= 10;
      compressed = await sharp(buffer)
        .resize(maxDimension, maxDimension, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality, mozjpeg: true })
        .toBuffer();
    }

    const compressedBase64 = compressed.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${compressedBase64}`;

    return { data: dataUrl, contentType: 'image/jpeg' };
  } catch {
    // If compression fails, return original
    return { data: base64Data, contentType: 'image/jpeg' };
  }
}
