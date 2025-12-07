import type React from 'react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { type SurveyJSJson, SurveyRenderer } from '@/components/forms/SurveyRenderer';
import { FormContainer } from '@/components/ui/form-container';
import { Logo } from '@/components/ui/logo';
import { PageContainer } from '@/components/ui/page-container';
import { useAuth } from '../context/AuthContext';

const SurveyFormPage: React.FC = () => {
  useAuth();
  const navigate = useNavigate();
  const { surveyId } = useParams<{ surveyId: string }>();
  // Note: eventId from searchParams may be used for future event-specific logic

  const [surveyJson, setSurveyJson] = useState<SurveyJSJson | null>(null);
  const [surveyName, setSurveyName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!surveyId) {
      setError('Survey ID is required');
      setLoading(false);
      return;
    }

    const fetchSurvey = async () => {
      try {
        // Get survey questions - this endpoint returns questions in the old format
        // We may need to adapt this to work with form templates instead
        const response = await fetch(`/api/surveyQuestions?id=${surveyId}`);
        const data = (await response.json()) as {
          success?: boolean;
          questions?: Array<{
            id: string;
            text: string;
            type: string;
            required?: boolean;
            options?: string[];
            [key: string]: unknown;
          }>;
          name?: string;
          message?: string;
          error?: string;
        };

        if (!response.ok || data.message || data.error) {
          setError(data.error || data.message || 'Failed to load survey');
          return;
        }

        if (data.questions && data.name) {
          setSurveyName(data.name);

          // Convert questions to SurveyJS JSON format
          const elements = data.questions.map(q => {
            const baseElement: Record<string, unknown> = {
              type: q.type === 'text' ? 'text' : q.type === 'textarea' ? 'comment' : 'text',
              name: q.id,
              title: q.text,
              isRequired: q.required || false,
            };

            if (q.options && q.options.length > 0) {
              if (q.type === 'checkbox') {
                baseElement.type = 'checkbox';
                baseElement.choices = q.options;
              } else if (q.type === 'radio') {
                baseElement.type = 'radiogroup';
                baseElement.choices = q.options;
              }
            }

            return baseElement;
          });

          const converted: SurveyJSJson = {
            title: data.name,
            pages: [
              {
                elements,
              },
            ],
            showProgressBar: 'bottom',
          };

          setSurveyJson(converted);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load survey');
      } finally {
        setLoading(false);
      }
    };

    fetchSurvey();
  }, [surveyId]);

  const handleSubmit = async (formData: Record<string, unknown>) => {
    if (!surveyId) {
      setError('Survey ID is required');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      // Convert SurveyJS format to the expected format
      const responses = Object.entries(formData).map(([questionId, value]) => ({
        questionId,
        responseText: String(value),
      }));

      const response = await fetch('/api/userResponses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surveyId,
          responses,
        }),
      });

      const data = (await response.json()) as {
        success?: boolean;
        message?: string;
        error?: string;
      };

      if (!response.ok || !data.success) {
        setError(data.error || data.message || 'Failed to submit survey');
        setSubmitting(false);
        return;
      }

      navigate('/surveys', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit survey');
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
          <h1 className="text-4xl font-bold text-base-content mb-2">{surveyName || 'Survey'}</h1>
          <p className="text-sm opacity-70">Please complete all required fields</p>
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
              <p className="mt-4 text-base-content opacity-70">Submitting...</p>
            </div>
          ) : (
            <div className="alert alert-warning">
              <span>Survey not available. Please contact an administrator.</span>
            </div>
          )}
        </FormContainer>
      </div>
    </PageContainer>
  );
};

export default SurveyFormPage;
