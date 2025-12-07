import type React from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FormContainer } from '@/components/ui/form-container';
import { Logo } from '@/components/ui/logo';
import { PageContainer } from '@/components/ui/page-container';
import { PrimaryButton } from '@/components/ui/primary-button';
import { useAuth } from '../context/AuthContext';

interface EventSurvey {
  eventId: string;
  eventName: string;
  eventDate?: string | Date;
  surveyId: string;
  surveyName: string;
  accessibleAt?: string | Date;
  isAccessible: boolean;
  completed?: boolean;
}

const SurveyListPage: React.FC = () => {
  useAuth();
  const [surveys, setSurveys] = useState<EventSurvey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSurveys = async () => {
      try {
        const response = await fetch('/api/surveys/accessible');
        const data = (await response.json()) as {
          success: boolean;
          surveys?: EventSurvey[];
          error?: string;
        };

        if (!response.ok || !data.success) {
          setError(data.error || 'Failed to load surveys');
          return;
        }

        setSurveys(data.surveys || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load surveys');
      } finally {
        setLoading(false);
      }
    };

    fetchSurveys();
  }, []);

  const formatDate = (dateString?: string | Date): string => {
    if (!dateString) return 'Date TBD';
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return String(dateString);
    }
  };

  const getTimeUntilAccessible = (accessibleAt?: string | Date): string | null => {
    if (!accessibleAt) return null;
    try {
      const date = typeof accessibleAt === 'string' ? new Date(accessibleAt) : accessibleAt;
      const now = new Date();
      const diff = date.getTime() - now.getTime();

      if (diff <= 0) return null;

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 0) {
        return `${hours} hour${hours > 1 ? 's' : ''} and ${minutes} minute${
          minutes !== 1 ? 's' : ''
        }`;
      }
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } catch {
      return null;
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
      <div className="w-full max-w-4xl">
        <div className="text-center mb-6">
          <div className="mb-4 flex justify-center">
            <Logo size="md" />
          </div>
          <h1 className="text-4xl font-bold text-base-content mb-2">Available Surveys</h1>
          <p className="text-sm opacity-70">Complete surveys for your registered events</p>
        </div>

        {error && (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
          </div>
        )}

        {surveys.length === 0 ? (
          <FormContainer>
            <div className="text-center py-8">
              <p className="text-base-content opacity-70">
                No surveys available at this time. Surveys become available 1 hour after event
                activation.
              </p>
            </div>
          </FormContainer>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {surveys.map(survey => {
              const timeUntil = getTimeUntilAccessible(survey.accessibleAt);
              return (
                <div
                  key={`${survey.eventId}-${survey.surveyId}`}
                  className="card bg-base-200 shadow-xl"
                >
                  <div className="card-body">
                    <h3 className="card-title text-base-content">{survey.surveyName}</h3>
                    <p className="text-sm opacity-70">Event: {survey.eventName}</p>
                    {survey.eventDate && (
                      <p className="text-sm opacity-70">
                        Event Date: {formatDate(survey.eventDate)}
                      </p>
                    )}

                    {survey.completed ? (
                      <div className="mt-4">
                        <div className="badge badge-success">Completed</div>
                      </div>
                    ) : survey.isAccessible ? (
                      <div className="card-actions justify-end mt-4">
                        <Link to={`/surveys/${survey.surveyId}?eventId=${survey.eventId}`}>
                          <PrimaryButton>Start Survey</PrimaryButton>
                        </Link>
                      </div>
                    ) : (
                      <div className="mt-4">
                        <div className="alert alert-info">
                          <span>
                            Survey will be available {timeUntil ? `in ${timeUntil}` : 'soon'}
                          </span>
                          {survey.accessibleAt && (
                            <p className="text-xs mt-1">
                              Available at: {formatDate(survey.accessibleAt)}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageContainer>
  );
};

export default SurveyListPage;
