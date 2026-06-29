import { NextRequest, NextResponse } from 'next/server';
import { getPresignedUploadUrl } from '@/lib/r2';
import { db } from '@/lib/db';
import { kycUploads } from '@/lib/schema';
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
    const uploadUrl = await getPresignedUploadUrl(r2Key, body.contentType);

    await db.insert(kycUploads).values({
      userId: body.userId,
      documentType: body.documentType,
      r2Key,
      status: 'pending',
    });

    return NextResponse.json({ uploadUrl, r2Key });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
