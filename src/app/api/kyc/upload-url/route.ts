import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createKycUpload, findUserById, findUserByEmail } from '@/lib/edge-db';
import { isR2Configured, uploadToR2 } from '@/lib/r2';
import { isGitHubConfigured, uploadToGitHub } from '@/lib/github-storage';
import { z } from 'zod';

const schema = z.object({
  documentType: z.enum(['national_id_front', 'national_id_back', 'selfie']),
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
    let user = await findUserById(userId);
    if (!user && session.user.email) {
      user = await findUserByEmail(session.user.email);
    }
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const actualUserId = user.id;
    const body = schema.parse(await req.json());

    const r2Key = `kyc/${actualUserId}/${body.documentType}-${Date.now()}`;
    const ext = body.contentType.includes('png') ? 'png' : 'jpg';
    const ghFilename = `${actualUserId}_${body.documentType}_${Date.now()}.${ext}`;

    let storage: 'r2' | 'github' = 'github';
    let storedFileData: string | undefined = body.fileData;

    if (!storedFileData) {
      return NextResponse.json({ error: 'No file data provided' }, { status: 400 });
    }

    // Try R2 first (no size limit)
    if (isR2Configured()) {
      try {
        const buffer = Buffer.from(storedFileData.split(',')[1] || storedFileData, 'base64');
        await uploadToR2(r2Key, buffer, body.contentType);
        storage = 'r2';
        storedFileData = undefined;
      } catch {
        // R2 failed, try GitHub
      }
    }

    // Try GitHub storage using Git Blobs API (supports up to 100MB)
    if (storage !== 'r2' && isGitHubConfigured() && storedFileData) {
      try {
        await uploadToGitHub(ghFilename, storedFileData);
        storage = 'github';
        storedFileData = undefined;
      } catch (githubErr) {
        // GitHub failed too - return error instead of falling back to Edge Config
        return NextResponse.json({
          error: 'Failed to upload document. Please try again with a smaller image or try again later.',
          details: githubErr instanceof Error ? githubErr.message : 'Unknown error',
        }, { status: 500 });
      }
    }

    if (!isGitHubConfigured() && !isR2Configured()) {
      return NextResponse.json({
        error: 'Storage not configured. Please contact support.',
      }, { status: 500 });
    }

    // Create KYC upload record - NO fileData stored in Edge Config
    const upload = await createKycUpload({
      userId: actualUserId,
      documentType: body.documentType,
      r2Key: storage === 'github' ? `github/${ghFilename}` : r2Key,
      fileData: undefined, // NEVER store file data in Edge Config
      fileName: storage === 'github' ? ghFilename : body.fileName,
      contentType: body.contentType,
    });

    return NextResponse.json({
      success: true,
      r2Key: storage === 'github' ? `github/${ghFilename}` : r2Key,
      uploadId: upload.id,
      storage,
      message: storage === 'r2'
        ? 'Document uploaded to Cloudflare R2'
        : 'Document uploaded to secure storage',
    });
  } catch (e: unknown) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message || 'Validation error' }, { status: 400 });
    }
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
