import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllKyc, getKycFileData, KycUpload } from '@/lib/edge-db-v2';
import { isR2Configured, getPresignedViewUrl } from '@/lib/r2';
import { isGitHubConfigured, getFromGitHub } from '@/lib/github-storage';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = (session.user as { role?: string }).role;
    const userId = parseInt((session.user as { id: string }).id);
    const docId = parseInt(req.nextUrl.searchParams.get('docId') || '0');

    if (!docId) {
      return NextResponse.json({ error: 'docId required' }, { status: 400 });
    }

    // Get the document metadata
    const allKyc = await getAllKyc();
    const doc = allKyc.find((k: KycUpload) => k.id === docId);

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Admin can view any document, customers can only view their own
    if (role !== 'admin' && doc.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if this is a GitHub-stored document
    if (doc.r2Key?.startsWith('github/') && isGitHubConfigured()) {
      const filename = doc.r2Key.replace('github/', '');
      const fileData = await getFromGitHub(filename);
      if (fileData) {
        return NextResponse.json({
          documentType: doc.documentType,
          contentType: doc.contentType || 'image/jpeg',
          fileData,
          storage: 'github',
        });
      }
    }

    // Check if fileName matches a GitHub filename
    if (doc.fileName && isGitHubConfigured()) {
      const fileData = await getFromGitHub(doc.fileName);
      if (fileData) {
        return NextResponse.json({
          documentType: doc.documentType,
          contentType: doc.contentType || 'image/jpeg',
          fileData,
          storage: 'github',
        });
      }
    }

    // Try Edge Config (chunked or single key)
    const fileData = await getKycFileData(docId);
    if (fileData?.fileData) {
      return NextResponse.json({
        documentType: doc.documentType,
        contentType: fileData.contentType || doc.contentType || 'image/jpeg',
        fileName: fileData.fileName || doc.fileName,
        fileData: fileData.fileData,
        storage: 'edge-config',
      });
    }

    // Check if the doc has fileData in the array (old format)
    if (doc.fileData) {
      return NextResponse.json({
        documentType: doc.documentType,
        contentType: doc.contentType || 'image/jpeg',
        fileData: doc.fileData,
        storage: 'edge-config',
      });
    }

    // If R2 is configured, return presigned URL
    if (isR2Configured() && doc.r2Key && !doc.r2Key.startsWith('github/')) {
      try {
        const viewUrl = await getPresignedViewUrl(doc.r2Key);
        return NextResponse.json({
          documentType: doc.documentType,
          viewUrl,
          storage: 'r2',
        });
      } catch {
        return NextResponse.json({ error: 'Failed to generate view URL' }, { status: 500 });
      }
    }

    // No file data available
    return NextResponse.json({
      error: 'Document file not available.',
      r2Key: doc.r2Key,
      docId,
    }, { status: 404 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
