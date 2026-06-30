import sharp from 'sharp';

// Compress image to reduce size for Edge Config storage
// Edge Config has ~2MB limit per key, so we compress aggressively
export async function compressImage(base64Data: string): Promise<{ data: string; contentType: string }> {
  try {
    // Extract the base64 data from data URL
    const matches = base64Data.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!matches) {
      return { data: base64Data, contentType: 'image/jpeg' };
    }

    const buffer = Buffer.from(matches[2], 'base64');

    // Compress with sharp - resize to max 800px wide, JPEG quality 70
    // This reduces most images to under 100KB
    const compressed = await sharp(buffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 70, mozjpeg: true })
      .toBuffer();

    const compressedBase64 = compressed.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${compressedBase64}`;

    return { data: dataUrl, contentType: 'image/jpeg' };
  } catch {
    // If compression fails, return original
    return { data: base64Data, contentType: 'image/jpeg' };
  }
}
