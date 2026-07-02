import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { findUserById, findUserByEmail, createKycUpload, updateUser, getKycByUserId, KycUpload } from '@/lib/edge-db-v2';
import { z } from 'zod';

const submitKycSchema = z.object({
  documents: z.array(z.object({
    documentType: z.enum(['national_id_front', 'national_id_back', 'selfie']),
    r2Key: z.string(),
  })).min(1, 'At least one document is required'),
});

// GET: fetch current user's KYC status
export async function GET() {
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

    const kycDocs = await getKycByUserId(actualUserId);
    return NextResponse.json({
      kycStatus: user.kycStatus,
      kycSubmittedAt: user.kycSubmittedAt,
      kycReviewedAt: user.kycReviewedAt,
      kycRejectionReason: user.kycRejectionReason,
      documents: kycDocs.map((d: KycUpload) => ({
        id: d.id,
        documentType: d.documentType,
        status: d.status,
        uploadedAt: d.uploadedAt,
        rejectionReason: d.rejectionReason,
      })),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST: submit KYC documents for review
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

    if (user.kycStatus === 'approved') {
      return NextResponse.json({ error: 'KYC already approved' }, { status: 400 });
    }

    const body = submitKycSchema.parse(await req.json());

    // Create KYC upload records
    for (const doc of body.documents) {
      await createKycUpload({
        userId: actualUserId,
        documentType: doc.documentType,
        r2Key: doc.r2Key,
      });
    }

    // Update user KYC status to submitted
    await updateUser(user.email, {
      kycStatus: 'submitted',
      kycSubmittedAt: new Date().toISOString(),
      kycReviewedAt: undefined,
      kycRejectionReason: undefined,
    });

    return NextResponse.json({
      success: true,
      message: 'KYC documents submitted for review',
      kycStatus: 'submitted',
    }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message || 'Validation error' }, { status: 400 });
    }
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
