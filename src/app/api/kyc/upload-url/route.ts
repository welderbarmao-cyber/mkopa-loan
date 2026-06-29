import { NextRequest, NextResponse } from 'next/server';
import { getPresignedUploadUrl } from '@/lib/r2';
import { createKycUpload } from '@/lib/edge-db';
import { z } from 'zod';

const schema = z.object({
  userId: z.number(),
  documentType: z.enum(['national_id', 'passport', 'selfie']),
  contentType: z.string().default('image/jpeg'),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const r2Key = `kyc/${body.userId}/${body.documentType}-${Date.now()}`;

    // Try to get presigned URL (will fail if R2 not configured)
    let uploadUrl = '';
    try {
      uploadUrl = await getPresignedUploadUrl(r2Key, body.contentType);
    } catch {
      // R2 not configured - return empty URL (uploads will be skipped)
      uploadUrl = '';
    }

    await createKycUpload({
      userId: body.userId,
      documentType: body.documentType,
      r2Key,
    });

    return NextResponse.json({ uploadUrl, r2Key });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
