import type React from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type SurveyJSJson, SurveyRenderer } from '@/components/forms/SurveyRenderer';
import { FormContainer } from '@/components/ui/form-container';
import { Logo } from '@/components/ui/logo';
import { PageContainer } from '@/components/ui/page-container';

const GuestRegistrationPage: React.FC = () => {
  const navigate = useNavigate();
  const [surveyJson, setSurveyJson] = useState<SurveyJSJson | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const storedEventId = sessionStorage.getItem('guestEventId');
    const storedEventName = sessionStorage.getItem('guestEventName');
    const storedEventCode = sessionStorage.getItem('guestEventCode');

    if (!storedEventId || !storedEventCode) {
      navigate('/guests/entry', { replace: true });
      return;
    }

    // Create SurveyJS form for guest registration
    const registrationForm: SurveyJSJson = {
      title: 'Guest Registration',
      description: `Registering for: ${storedEventName || 'Event'}`,
      pages: [
        {
          elements: [
            {
              type: 'text',
              name: 'name',
              title: 'Your Name',
              isRequired: true,
            },
            {
              type: 'text',
              name: 'email',
              title: 'Email (optional)',
              inputType: 'email',
              validators: [{ type: 'email' }],
            },
            {
              type: 'text',
              name: 'phone',
              title: 'Phone Number (optional)',
              inputType: 'tel',
            },
          ],
        },
      ],
      showProgressBar: 'bottom',
    };

    setSurveyJson(registrationForm);
    setLoading(false);
  }, [navigate]);

  const handleSubmit = async (formData: Record<string, unknown>) => {
    setError('');
    setSubmitting(true);

    const eventId = sessionStorage.getItem('guestEventId');
    const storedEventCode = sessionStorage.getItem('guestEventCode');

    if (!eventId || !storedEventCode) {
      setError('Event information missing. Please start over.');
      setSubmitting(false);
      navigate('/guests/entry', { replace: true });
      return;
    }

    try {
      const response = await fetch('/api/guests/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventCode: storedEventCode,
          name: formData.name as string,
          email: (formData.email as string) || undefined,
          phone: (formData.phone as string) || undefined,
        }),
      });

      const data = (await response.json()) as {
        success: boolean;
        guestId?: string;
        error?: string;
      };

      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to register as guest');
        setSubmitting(false);
        return;
      }

      // Store guest ID for consent form
      if (data.guestId) {
        sessionStorage.setItem('guestId', data.guestId);
      }

      // Navigate to guest consent form
      navigate('/guests/consent', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register as guest');
      setSubmitting(false);
    }
  };

  const handleError = (err: Error) => {
    setError(err.message);
    setSubmitting(false);
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
          <h1 className="text-4xl font-bold text-base-content mb-2">Guest Registration</h1>
          <p className="text-sm opacity-70">Please provide your information to continue</p>
        </div>

        <FormContainer>
          {error && (
            <div className="alert alert-error mb-4">
              <span>{error}</span>
            </div>
          )}

          {surveyJson && !submitting ? (
            <SurveyRenderer
              surveyJson={surveyJson}
              onSubmit={handleSubmit}
              onError={handleError}
              showProgressBar={true}
            />
          ) : submitting ? (
            <div className="text-center py-8">
              <span className="loading loading-spinner loading-lg"></span>
              <p className="mt-4 text-base-content opacity-70">Registering...</p>
            </div>
          ) : (
            <div className="alert alert-warning">
              <span>Registration form not available.</span>
            </div>
          )}
        </FormContainer>
      </div>
    </PageContainer>
  );
};

export default GuestRegistrationPage;
