import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { findUserById, updateUserById } from '@/lib/edge-db';
import { z } from 'zod';

const assignSchema = z.object({
  userId: z.number(),
  loanLimit: z.number().min(5000).max(500000),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const role = (session.user as { role?: string }).role;
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = assignSchema.parse(await req.json());

    const user = await findUserById(body.userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    if (user.kycStatus !== 'approved') {
      return NextResponse.json({ error: 'User KYC must be approved first' }, { status: 400 });
    }

    await updateUserById(body.userId, {
      loanLimit: body.loanLimit,
      loanLimitAssignedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: `Loan limit of KES ${body.loanLimit.toLocaleString()} assigned to ${user.name}`,
      loanLimit: body.loanLimit,
    });
  } catch (e: unknown) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message || 'Validation error' }, { status: 400 });
    }
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
