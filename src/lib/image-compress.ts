import sharp from 'sharp';

// Edge Config has a hard limit of ~2MB per key
// For large images, we split the base64 data into multiple keys
// Each chunk is stored as kyc_file_<id>_chunk_<n>

const CHUNK_SIZE = 500 * 1024; // 500KB per chunk (safe margin under 2MB limit)

export async function compressImage(base64Data: string): Promise<{ data: string; contentType: string }> {
  try {
    const matches = base64Data.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!matches) {
      return { data: base64Data, contentType: 'image/jpeg' };
    }

    const buffer = Buffer.from(matches[2], 'base64');

    // Try to store as-is first (no compression)
    // Only compress if the base64 would exceed 1.8MB (leaving margin for key metadata)
    const estimatedBase64Size = buffer.length * 1.37; // base64 overhead

    if (estimatedBase64Size < 1800 * 1024) {
      // Image is small enough - store as-is, no compression
      return { data: base64Data, contentType: matches[1] };
    }

    // For larger images, compress with high quality (90) and cap at 4K resolution
    let quality = 95;
    const maxDimension = 3840; // 4K - preserve high resolution

    const metadata = await sharp(buffer).metadata();
    if ((metadata.width || 0) > maxDimension || (metadata.height || 0) > maxDimension) {
      // Only resize if larger than 4K
    }

    let compressed = await sharp(buffer)
      .resize(maxDimension, maxDimension, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();

    // If still too large, reduce quality gradually
    while (compressed.length * 1.37 > 1800 * 1024 && quality > 30) {
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
    return { data: base64Data, contentType: 'image/jpeg' };
  }
}

// Split base64 data into chunks for Edge Config storage
export function chunkBase64(data: string): string[] {
  // Remove data URL prefix for chunking
  const matches = data.match(/^data:(image\/\w+);base64,(.+)$/);
  const rawData = matches ? matches[2] : data;
  const prefix = matches ? `data:${matches[1]};base64,` : '';

  // If data is small enough, return as single chunk
  if (rawData.length < CHUNK_SIZE) {
    return [prefix + rawData];
  }

  // Split into chunks
  const chunks: string[] = [];
  for (let i = 0; i < rawData.length; i += CHUNK_SIZE) {
    const chunk = rawData.substring(i, i + CHUNK_SIZE);
    // First chunk includes the prefix, rest don't
    chunks.push(i === 0 ? prefix + chunk : chunk);
  }
  return chunks;
}

// Reassemble chunks back into base64 data
export function reassembleChunks(chunks: string[]): string {
  if (chunks.length === 0) return '';
  if (chunks.length === 1) return chunks[0];

  // First chunk has the prefix, rest are raw base64
  const firstChunk = chunks[0];
  const matches = firstChunk.match(/^(data:image\/\w+;base64,)(.+)$/);
  if (!matches) return chunks.join('');

  const prefix = matches[1];
  const firstData = matches[2];
  const restData = chunks.slice(1).join('');
  return prefix + firstData + restData;
}

export { CHUNK_SIZE };
