import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

// R2 is initialized lazily — only when credentials are valid
let _r2: S3Client | null = null;

function getR2(): S3Client | null {
  if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
    return null;
  }
  if (process.env.R2_ACCESS_KEY_ID === 'placeholder') {
    return null;
  }
  if (!_r2) {
    _r2 = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return _r2;
}

const BUCKET = process.env.R2_BUCKET_NAME || 'mkopa-kyc';

export function isR2Configured(): boolean {
  return getR2() !== null;
}

export async function getPresignedUploadUrl(key: string, contentType: string): Promise<string> {
  const r2 = getR2();
  if (!r2) throw new Error('R2 not configured');
  const cmd = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType });
  return getSignedUrl(r2, cmd, { expiresIn: 300 });
}

export async function getPresignedViewUrl(key: string): Promise<string> {
  const r2 = getR2();
  if (!r2) throw new Error('R2 not configured');
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(r2, cmd, { expiresIn: 3600 });
}

// Upload directly to R2 from server (used when presigned URL approach fails)
export async function uploadToR2(key: string, body: Buffer, contentType: string): Promise<void> {
  const r2 = getR2();
  if (!r2) throw new Error('R2 not configured');
  const { PutObjectCommand } = await import('@aws-sdk/client-s3');
  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  });
  await r2.send(cmd);
}
