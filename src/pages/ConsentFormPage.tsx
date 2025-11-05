import type React from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormContainer } from '@/components/ui/form-container';
import { Logo } from '@/components/ui/logo';
import { PageContainer } from '@/components/ui/page-container';
import { auth } from '$lib/firebase/firebase.app';

interface ConsentFormTemplate {
  id: string;
  name: string;
  questions?: readonly {
    id?: string;
    text?: string;
    type?: string;
    required?: boolean;
  }[];
}

const ConsentFormPage: React.FC = () => {
  const navigate = useNavigate();
  const [template, setTemplate] = useState<ConsentFormTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const response = await fetch('/api/forms/consent');
        const data = (await response.json()) as {
          success: boolean;
          template?: ConsentFormTemplate;
          error?: string;
        };

        if (!response.ok || !data.success) {
          setError(data.error || 'Failed to load consent form');
          return;
        }

        if (data.template) {
          setTemplate(data.template);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load consent form');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplate();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    if (!agreed) {
      setError('You must agree to the consent form to continue');
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/forms/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = (await response.json()) as {
        success: boolean;
        error?: string;
      };

      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to submit consent form');
        setSubmitting(false);
        return;
      }

      // Refresh auth token to get updated custom claims (signedConsentForm)
      const currentUser = auth.currentUser;
      if (currentUser) {
        // Force token refresh to get updated claims from backend
        await currentUser.getIdToken(true);
        // Navigate to dashboard - ProtectedRoute will allow access now that consentForm is true
        navigate('/dashboard', { replace: true });
      } else {
        // TODO: Handle case where user is not authenticated (should not happen)
        navigate('/authentication', { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit consent form');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <span className="loading loading-spinner loading-lg"></span>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="w-full max-w-2xl">
        <div className="text-center mb-6">
          <div className="mb-4 flex justify-center">
            <Logo size="md" />
          </div>
          <h1 className="text-4xl font-bold text-base-content mb-2">Consent Form</h1>
          <p className="text-sm opacity-70">Please review and consent to participate</p>
        </div>

        <FormContainer>
          {error && (
            <div className="alert alert-error">
              <span>{error}</span>
            </div>
          )}

          {template && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-base-content mb-4">{template.name}</h2>
                {template.questions && template.questions.length > 0 ? (
                  <div className="space-y-4">
                    {template.questions.map((question, index) => (
                      <div key={question.id || index} className="space-y-2">
                        <p className="text-base-content font-medium">{question.text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="prose text-base-content">
                    <p>TODO: Add consent form text here</p>
                    <p>
                      By checking the box below, you consent to participate in this research study.
                    </p>
                  </div>
                )}
              </div>

              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-3">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={e => setAgreed(e.target.checked)}
                    className="checkbox checkbox-primary"
                    required
                  />
                  <span className="label-text text-base-content">
                    I have read and understand the consent form and agree to participate
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting || !agreed}
                className="btn btn-primary w-full rounded-[20px] shadow-md font-semibold"
              >
                {submitting ? 'Submitting...' : 'I Consent'}
              </button>
            </form>
          )}

          {!template && !loading && (
            <div className="alert alert-warning">
              <span>Consent form template not available. Please contact an administrator.</span>
            </div>
          )}
        </FormContainer>
      </div>
    </PageContainer>
  );
};

export default ConsentFormPage;
