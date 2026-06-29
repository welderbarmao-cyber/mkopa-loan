'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Upload, CheckCircle, ArrowLeft, ShieldCheck, AlertCircle } from 'lucide-react';

type DocType = 'national_id' | 'passport';

export default function KycPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [docs, setDocs] = useState<Record<DocType, string | null>>({ national_id: null, passport: null });
  const [uploading, setUploading] = useState<DocType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [kycStatus, setKycStatus] = useState<string>('none');
  const [rejectionReason, setRejectionReason] = useState<string>('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?message=Please sign in to complete KYC');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetchKycStatus();
    }
  }, [session]);

  async function fetchKycStatus() {
    try {
      const res = await fetch('/api/kyc');
      const data = await res.json();
      if (res.ok) {
        setKycStatus(data.kycStatus);
        setRejectionReason(data.kycRejectionReason || '');
      }
    } catch {}
  }

  async function handleUpload(file: File, docType: DocType) {
    setUploading(docType);
    setError('');
    try {
      // Get upload URL (creates a record in DB)
      const res = await fetch('/api/kyc/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentType: docType, contentType: file.type }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Upload failed');
        return;
      }

      // In production, upload to R2 using data.uploadUrl
      // For now, just mark as uploaded locally
      setDocs(prev => ({ ...prev, [docType]: data.r2Key }));
    } catch {
      setError('Network error during upload');
    }
    setUploading(null);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError('');
    try {
      const documents = [];
      if (docs.national_id) documents.push({ documentType: 'national_id', r2Key: docs.national_id });
      if (docs.passport) documents.push({ documentType: 'passport', r2Key: docs.passport });

      if (documents.length === 0) {
        setError('Please upload at least one document');
        setSubmitting(false);
        return;
      }

      const res = await fetch('/api/kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Submission failed');
        return;
      }
      setSuccess('KYC documents submitted successfully! Admin will review shortly.');
      setTimeout(() => router.push('/dashboard'), 2000);
    } catch {
      setError('Network error');
    }
    setSubmitting(false);
  }

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-mkopa-green" />
      </div>
    );
  }

  // If already approved, show message
  if (kycStatus === 'approved') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <CheckCircle className="w-16 h-16 text-mkopa-green mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">KYC Already Approved!</h1>
          <p className="text-gray-500 mb-6">Your verification is complete. You can now proceed with your loan application.</p>
          <Link href="/dashboard" className="gradient-mkopa text-white px-6 py-2 rounded-lg font-semibold inline-block">
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/dashboard" className="p-2 hover:bg-gray-200 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold">KYC Verification</h1>
        </div>

        {rejectionReason && kycStatus === 'rejected' && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Previous submission rejected:</p>
              <p className="text-sm mt-1">{rejectionReason}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <ShieldCheck className="w-6 h-6 text-mkopa-green" />
            <div>
              <h2 className="font-bold">Upload Your Documents</h2>
              <p className="text-sm text-gray-500">Upload your National ID or Passport for verification</p>
            </div>
          </div>

          <div className="space-y-4">
            {(['national_id', 'passport'] as DocType[]).map(docType => (
              <div key={docType} className="border-2 border-dashed rounded-xl p-6 text-center">
                {docs[docType] ? (
                  <div className="flex items-center justify-center gap-2 text-mkopa-green">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium capitalize">{docType.replace('_', ' ')} uploaded</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                    <p className="font-medium capitalize mb-1">{docType.replace('_', ' ')}</p>
                    <p className="text-xs text-gray-400 mb-3">PNG, JPG up to 5MB</p>
                    {uploading === docType ? (
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-mkopa-green" />
                    ) : (
                      <label className="cursor-pointer text-sm text-mkopa-green font-semibold hover:underline">
                        Choose File
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], docType)}
                        />
                      </label>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
          {success && <p className="text-green-600 text-sm mt-4">{success}</p>}

          <button
            onClick={handleSubmit}
            disabled={submitting || (!docs.national_id && !docs.passport)}
            className="w-full mt-6 gradient-mkopa text-white py-3 rounded-lg font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : 'Submit for Review'}
          </button>
          <p className="text-xs text-gray-400 text-center mt-3">
            Upload at least one document. Both are recommended for faster approval.
          </p>
        </div>
      </div>
    </div>
  );
}
