import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createKycUpload } from '@/lib/edge-db';
import { z } from 'zod';

const schema = z.object({
  documentType: z.enum(['national_id', 'passport']),
  contentType: z.string().default('image/jpeg'),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = parseInt((session.user as { id: string }).id);
    const body = schema.parse(await req.json());

    // Generate a storage key (we're not actually uploading to R2 since credentials are placeholders)
    // In production, this would return a presigned R2 URL
    const r2Key = `kyc/${userId}/${body.documentType}-${Date.now()}`;

    // Create KYC upload record
    const upload = await createKycUpload({
      userId,
      documentType: body.documentType,
      r2Key,
    });

    // Return a mock upload URL (in production this would be a presigned R2 URL)
    // For now, the frontend can use this to mark the upload as complete
    return NextResponse.json({
      uploadUrl: '', // Empty since R2 not configured
      r2Key,
      uploadId: upload.id,
      message: 'Document record created. In production, upload to R2 using the presigned URL.',
    });
  } catch (e: unknown) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message || 'Validation error' }, { status: 400 });
    }
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
