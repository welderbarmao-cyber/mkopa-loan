import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllKyc, updateKyc, updateUser, getAllUsers, KycUpload, User } from '@/lib/edge-db';
import { z } from 'zod';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role;
  if (role !== 'admin') return null;
  return session;
}

// GET: list all KYC submissions (with user info)
export async function GET() {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const allKyc = await getAllKyc();
    const users = await getAllUsers();
    const userMap = new Map<number, User>(users.map((u: User) => [u.id, u]));

    // Group KYC by user
    const groupedByUser = new Map<number, KycUpload[]>();
    for (const k of allKyc) {
      if (!groupedByUser.has(k.userId)) groupedByUser.set(k.userId, []);
      groupedByUser.get(k.userId)!.push(k);
    }

    const records = Array.from(groupedByUser.entries()).map(([userId, docs]) => {
      const user = userMap.get(userId);
      return {
        userId,
        userName: user?.name || 'Unknown',
        userEmail: user?.email || 'Unknown',
        userPhone: user?.phone || 'Unknown',
        kycStatus: user?.kycStatus || 'none',
        submittedAt: user?.kycSubmittedAt,
        reviewedAt: user?.kycReviewedAt,
        rejectionReason: user?.kycRejectionReason,
        documents: docs.map((d: KycUpload) => ({
          id: d.id,
          documentType: d.documentType,
          r2Key: d.r2Key,
          status: d.status,
          uploadedAt: d.uploadedAt,
          rejectionReason: d.rejectionReason,
        })),
      };
    });

    // Sort: pending first, then submitted, then by date
    records.sort((a, b) => {
      const order = { submitted: 0, pending: 1, approved: 2, rejected: 3, none: 4 };
      const aOrder = order[a.kycStatus as keyof typeof order] ?? 5;
      const bOrder = order[b.kycStatus as keyof typeof order] ?? 5;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime();
    });

    return NextResponse.json({ records, total: records.length });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

const reviewSchema = z.object({
  userId: z.number(),
  action: z.enum(['approve', 'reject']),
  rejectionReason: z.string().optional(),
});

// PATCH: approve or reject a user's KYC
export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = reviewSchema.parse(await req.json());

    const users = await getAllUsers();
    const user = users.find((u: User) => u.id === body.userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    if (body.action === 'approve') {
      // Approve all user's KYC docs
      const userKyc = await getAllKyc();
      for (const k of userKyc.filter(k => k.userId === body.userId)) {
        await updateKyc(k.id, {
          status: 'approved',
          reviewedAt: new Date().toISOString(),
        });
      }
      // Auto-assign a random loan limit (between 10,000 and 200,000)
      const randomLimit = Math.floor(Math.random() * 19 + 10) * 10000; // 10,000 - 200,000
      await updateUser(user.email, {
        kycStatus: 'approved',
        kycReviewedAt: new Date().toISOString(),
        kycRejectionReason: undefined,
        loanLimit: randomLimit,
        loanLimitAssignedAt: new Date().toISOString(),
      });
      return NextResponse.json({ success: true, message: `KYC approved. Loan limit of KES ${randomLimit.toLocaleString()} assigned.` });
    } else {
      // Reject
      const userKyc = await getAllKyc();
      for (const k of userKyc.filter(k => k.userId === body.userId)) {
        await updateKyc(k.id, {
          status: 'rejected',
          reviewedAt: new Date().toISOString(),
          rejectionReason: body.rejectionReason,
        });
      }
      await updateUser(user.email, {
        kycStatus: 'rejected',
        kycReviewedAt: new Date().toISOString(),
        kycRejectionReason: body.rejectionReason || 'Documents did not meet requirements',
      });
      return NextResponse.json({ success: true, message: 'KYC rejected' });
    }
  } catch (e: unknown) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message || 'Validation error' }, { status: 400 });
    }
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
