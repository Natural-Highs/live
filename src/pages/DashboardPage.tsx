import type React from 'react';
import { useEffect, useState } from 'react';
import { FormContainer } from '@/components/ui/form-container';
import { Logo } from '@/components/ui/logo';
import { PageContainer } from '@/components/ui/page-container';
import { useAuth } from '../context/AuthContext';

interface Event {
  id: string;
  name: string;
  eventDate?: string;
  code?: string;
  isActive?: boolean;
  [key: string]: unknown;
}

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [eventCode, setEventCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [submittingCode, setSubmittingCode] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events');
        const data = (await response.json()) as {
          success: boolean;
          events?: Event[];
          error?: string;
        };

        if (!response.ok || !data.success) {
          setError(data.error || 'Failed to load events');
          return;
        }

        if (data.events) {
          setEvents(data.events);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load events');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const handleEventCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmittingCode(true);

    try {
      const response = await fetch('/api/users/eventCode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventCode }),
      });

      const data = (await response.json()) as {
        success: boolean;
        message?: string;
        error?: string;
      };

      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to register for event');
        setSubmittingCode(false);
        return;
      }

      setSuccess(data.message || 'Successfully registered for event');
      setEventCode('');
      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to register for event'
      );
      setSubmittingCode(false);
    }
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'TODO: Date TBD';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
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
          <h1 className="text-4xl font-bold text-base-content mb-2">
            Dashboard
          </h1>
          <p className="text-sm opacity-70">
            Welcome{user?.email ? `, ${user.email.split('@')[0]}` : ''}!
          </p>
        </div>

        <div className="space-y-6">
          <FormContainer>
            <h2 className="text-2xl font-semibold text-base-content mb-4">
              Join an Event
            </h2>
            <p className="text-sm opacity-70 mb-4">
              Enter your 4-digit event code to register
            </p>

            {error && (
              <div className="alert alert-error mb-4">
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="alert alert-success mb-4">
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleEventCodeSubmit} className="space-y-4">
              <div className="form-control">
                <label htmlFor="eventCode" className="label">
                  <span className="label-text">Event Code</span>
                </label>
                <input
                  id="eventCode"
                  type="text"
                  value={eventCode}
                  onChange={(e) => setEventCode(e.target.value)}
                  placeholder="Enter 4-digit code"
                  maxLength={4}
                  className="input input-bordered text-center text-2xl tracking-widest"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={submittingCode || eventCode.length !== 4}
                className="btn btn-primary w-full rounded-[20px] shadow-md font-semibold"
              >
                {submittingCode ? 'Registering...' : 'Join Event'}
              </button>
            </form>
          </FormContainer>

          <div>
            <h2 className="text-2xl font-semibold text-base-content mb-4">
              My Events
            </h2>
            {events.length === 0 ? (
              <div className="card bg-base-200 shadow-xl">
                <div className="card-body">
                  <p className="text-base-content opacity-70">
                    No events yet. Join an event using a code above.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {events.map((event) => (
                  <div key={event.id} className="card bg-base-200 shadow-xl">
                    <div className="card-body">
                      <h3 className="card-title text-base-content">
                        {event.name}
                      </h3>
                      <p className="text-sm opacity-70">
                        Date:{' '}
                        {formatDate(event.eventDate as string | undefined)}
                      </p>
                      {event.code && (
                        <p className="text-sm opacity-70">Code: {event.code}</p>
                      )}
                      <div className="card-actions justify-end mt-4">
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => {
                            // TODO: Navigate to event details or survey
                            console.log('Event clicked:', event.id);
                          }}
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-base-content mb-4">
              Available Surveys
            </h2>
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body">
                <p className="text-base-content opacity-70">
                  TODO: Display surveys available for your events
                </p>
                <p className="text-sm opacity-50 mt-2">
                  Surveys become available 1 hour after event activation
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default DashboardPage;
