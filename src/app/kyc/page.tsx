'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, CheckCircle, ArrowLeft, ShieldCheck, AlertCircle, User, CreditCard } from 'lucide-react';

type DocType = 'national_id_front' | 'national_id_back' | 'selfie';

interface DocState {
  r2Key: string | null;
  fileName: string;
  preview: string;
}

const DOC_CONFIG: Record<DocType, { label: string; icon: React.ComponentType<{ className?: string }>; desc: string }> = {
  national_id_front: { label: 'National ID (Front)', icon: CreditCard, desc: 'Front side of your ID' },
  national_id_back: { label: 'National ID (Back)', icon: CreditCard, desc: 'Back side of your ID' },
  selfie: { label: 'Selfie / Passport Photo', icon: User, desc: 'Clear photo of your face' },
};

export default function KycPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [docs, setDocs] = useState<Record<DocType, DocState | null>>({
    national_id_front: null,
    national_id_back: null,
    selfie: null,
  });
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

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleUpload(file: File, docType: DocType) {
    setUploading(docType);
    setError('');
    try {
      // No size or quality restrictions - any image allowed
      const base64Data = await fileToBase64(file);

      const res = await fetch('/api/kyc/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: docType,
          contentType: file.type,
          fileName: file.name,
          fileData: base64Data,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Upload failed');
        return;
      }

      setDocs(prev => ({
        ...prev,
        [docType]: {
          r2Key: data.r2Key,
          fileName: file.name,
          preview: base64Data,
        },
      }));
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
      if (docs.national_id_front?.r2Key) documents.push({ documentType: 'national_id_front', r2Key: docs.national_id_front.r2Key });
      if (docs.national_id_back?.r2Key) documents.push({ documentType: 'national_id_back', r2Key: docs.national_id_back.r2Key });
      if (docs.selfie?.r2Key) documents.push({ documentType: 'selfie', r2Key: docs.selfie.r2Key });

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

  const allUploaded = docs.national_id_front && docs.national_id_back && docs.selfie;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
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
              <p className="text-sm text-gray-500">Upload all 3 documents for verification</p>
            </div>
          </div>

          <div className="space-y-4">
            {(['national_id_front', 'national_id_back', 'selfie'] as DocType[]).map(docType => {
              const config = DOC_CONFIG[docType];
              const Icon = config.icon;
              return (
                <div key={docType} className="border-2 border-dashed rounded-xl p-6 text-center">
                  {docs[docType] ? (
                    <div className="space-y-3">
                      {docs[docType]?.preview && (
                        <div className="flex justify-center">
                          <img
                            src={docs[docType]?.preview}
                            alt={docType}
                            className="max-h-40 rounded-lg border"
                          />
                        </div>
                      )}
                      <div className="flex items-center justify-center gap-2 text-mkopa-green">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-medium">{config.label} uploaded</span>
                      </div>
                      <p className="text-xs text-gray-400">{docs[docType]?.fileName}</p>
                      <button
                        onClick={() => setDocs(prev => ({ ...prev, [docType]: null }))}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Remove and re-upload
                      </button>
                    </div>
                  ) : (
                    <>
                      <Icon className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                      <p className="font-medium mb-1">{config.label}</p>
                      <p className="text-xs text-gray-400 mb-3">{config.desc}</p>
                      {uploading === docType ? (
                        <div className="flex items-center justify-center gap-2 text-mkopa-green">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span className="text-sm">Uploading...</span>
                        </div>
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
              );
            })}
          </div>

          {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
          {success && <p className="text-green-600 text-sm mt-4">{success}</p>}

          <button
            onClick={handleSubmit}
            disabled={submitting || (!docs.national_id_front && !docs.national_id_back && !docs.selfie)}
            className="w-full mt-6 gradient-mkopa text-white py-3 rounded-lg font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : 'Submit for Review'}
          </button>
          <p className="text-xs text-gray-400 text-center mt-3">
            {allUploaded
              ? 'All documents uploaded. Click submit to send for review.'
              : 'Upload all 3 documents for faster approval. At least one is required.'}
          </p>
        </div>
      </div>
    </div>
  );
}
