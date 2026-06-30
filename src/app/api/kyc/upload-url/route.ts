import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createKycUpload } from '@/lib/edge-db';
import { isR2Configured, uploadToR2 } from '@/lib/r2';
import { z } from 'zod';

const schema = z.object({
  documentType: z.enum(['national_id', 'passport']),
  contentType: z.string().default('image/jpeg'),
  fileName: z.string().optional(),
  fileData: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = parseInt((session.user as { id: string }).id);
    const body = schema.parse(await req.json());

    const r2Key = `kyc/${userId}/${body.documentType}-${Date.now()}`;

    let storage: 'r2' | 'edge-config' = 'edge-config';
    let storedFileData: string | undefined = body.fileData;

    // Try R2 first if configured (no size limit)
    if (isR2Configured() && storedFileData) {
      try {
        const buffer = Buffer.from(storedFileData.split(',')[1] || storedFileData, 'base64');
        await uploadToR2(r2Key, buffer, body.contentType);
        storage = 'r2';
        storedFileData = undefined;
      } catch {
        storage = 'edge-config';
      }
    }

    // Store in Edge Config with chunking (no compression - preserves original quality)
    // createKycUpload handles chunking automatically for large files
    const upload = await createKycUpload({
      userId,
      documentType: body.documentType,
      r2Key,
      fileData: storage === 'edge-config' ? storedFileData : undefined,
      fileName: body.fileName,
      contentType: body.contentType,
    });

    return NextResponse.json({
      success: true,
      r2Key,
      uploadId: upload.id,
      storage,
      message: storage === 'r2'
        ? 'Document uploaded to Cloudflare R2'
        : 'Document stored securely',
    });
  } catch (e: unknown) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message || 'Validation error' }, { status: 400 });
    }
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
