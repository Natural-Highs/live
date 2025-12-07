import type React from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormContainer } from '@/components/ui/form-container';
import { Logo } from '@/components/ui/logo';
import { PageContainer } from '@/components/ui/page-container';
import { useAuth } from '../context/AuthContext';

interface UserProfile {
  id: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: string;
  createdAt?: string | Date;
  [key: string]: unknown;
}

interface UserEvent {
  id: string;
  eventId: string;
  eventCode: string;
  registeredAt: string | Date;
  event?: {
    id: string;
    name: string;
    eventDate?: string;
    code?: string;
    isActive?: boolean;
    [key: string]: unknown;
  };
}

const ProfilePage: React.FC = () => {
  useAuth(); // Ensure auth context is available
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userEvents, setUserEvents] = useState<UserEvent[]>([]);
  const [eventCode, setEventCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [submittingCode, setSubmittingCode] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // Check for pending event code from guest entry page
    const pendingCode = sessionStorage.getItem('pendingEventCode');
    if (pendingCode) {
      setEventCode(pendingCode);
      sessionStorage.removeItem('pendingEventCode');
      // Auto-submit if code is valid
      setTimeout(() => {
        const form = document.querySelector('form[onsubmit]') as HTMLFormElement | null;
        if (form && pendingCode.length === 4) {
          form.requestSubmit();
        }
      }, 500);
    }

    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/users/profile');
        const data = (await response.json()) as {
          success: boolean;
          data?: UserProfile;
          error?: string;
        };

        if (!response.ok || !data.success) {
          setError(data.error || 'Failed to load profile');
          return;
        }

        if (data.data) {
          setProfile(data.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    const fetchUserEvents = async () => {
      try {
        const response = await fetch('/api/users/events');
        const data = (await response.json()) as {
          success: boolean;
          events?: UserEvent[];
          error?: string;
        };

        if (response.ok && data.success && data.events) {
          setUserEvents(data.events);
        }
      } catch (err) {
        console.error('Failed to fetch user events:', err);
      }
    };

    fetchProfile();
    fetchUserEvents();
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
      // Reload to refresh events list
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register for event');
      setSubmittingCode(false);
    }
  };

  const formatDate = (dateString?: string | Date | { toDate?: () => Date }): string => {
    if (!dateString) return 'Date TBD';
    try {
      let date: Date;
      if (typeof dateString === 'string') {
        date = new Date(dateString);
      } else if (dateString instanceof Date) {
        date = dateString;
      } else if (
        typeof dateString === 'object' &&
        'toDate' in dateString &&
        typeof dateString.toDate === 'function'
      ) {
        date = dateString.toDate();
      } else {
        date = new Date();
      }

      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return String(dateString);
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
          <h1 className="text-4xl font-bold text-base-content mb-2">Profile</h1>
        </div>

        <div className="space-y-6">
          {/* User Information */}
          <FormContainer>
            <h2 className="text-2xl font-semibold text-base-content mb-4">User Information</h2>
            {profile ? (
              <div className="space-y-2">
                <div>
                  <span className="font-semibold">Email: </span>
                  <span>{profile.email || 'Not set'}</span>
                </div>
                {profile.username && (
                  <div>
                    <span className="font-semibold">Username: </span>
                    <span>{profile.username}</span>
                  </div>
                )}
                {(profile.firstName || profile.lastName) && (
                  <div>
                    <span className="font-semibold">Name: </span>
                    <span>
                      {profile.firstName || ''} {profile.lastName || ''}
                    </span>
                  </div>
                )}
                {profile.phone && (
                  <div>
                    <span className="font-semibold">Phone: </span>
                    <span>{profile.phone}</span>
                  </div>
                )}
                {profile.dateOfBirth && (
                  <div>
                    <span className="font-semibold">Date of Birth: </span>
                    <span>{formatDate(profile.dateOfBirth)}</span>
                  </div>
                )}
                {profile.createdAt && (
                  <div>
                    <span className="font-semibold">Member Since: </span>
                    <span>{formatDate(profile.createdAt)}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-base-content opacity-70">No profile information available</p>
            )}
          </FormContainer>

          {/* Event Code Entry */}
          <FormContainer>
            <h2 className="text-2xl font-semibold text-base-content mb-4">Join an Event</h2>
            <p className="text-sm opacity-70 mb-4">Enter your 4-digit event code to register</p>

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
                  onChange={e => setEventCode(e.target.value)}
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

          {/* Registered Events */}
          <div>
            <h2 className="text-2xl font-semibold text-base-content mb-4">Registered Events</h2>
            {userEvents.length === 0 ? (
              <div className="card bg-base-200 shadow-xl">
                <div className="card-body">
                  <p className="text-base-content opacity-70">
                    No events registered yet. Join an event using a code above.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userEvents.map(userEvent => (
                  <div key={userEvent.id} className="card bg-base-200 shadow-xl">
                    <div className="card-body">
                      {userEvent.event ? (
                        <>
                          <h3 className="card-title text-base-content">{userEvent.event.name}</h3>
                          <p className="text-sm opacity-70">
                            Date: {formatDate(userEvent.event.eventDate)}
                          </p>
                          {userEvent.event.code && (
                            <p className="text-sm opacity-70">Code: {userEvent.event.code}</p>
                          )}
                          <p className="text-sm opacity-70">
                            Registered: {formatDate(userEvent.registeredAt)}
                          </p>
                        </>
                      ) : (
                        <>
                          <h3 className="card-title text-base-content">
                            Event {userEvent.eventCode}
                          </h3>
                          <p className="text-sm opacity-70">
                            Registered: {formatDate(userEvent.registeredAt)}
                          </p>
                        </>
                      )}
                      <div className="card-actions justify-end mt-4">
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => {
                            navigate('/surveys');
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

          {/* Surveys Link */}
          <div>
            <h2 className="text-2xl font-semibold text-base-content mb-4">Surveys</h2>
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body">
                <p className="text-base-content opacity-70">
                  {userEvents.length === 0
                    ? 'Complete surveys for your registered events here'
                    : 'Surveys become available 1 hour after event activation'}
                </p>
                {userEvents.length > 0 && (
                  <div className="card-actions justify-end mt-4">
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => {
                        navigate('/surveys');
                      }}
                    >
                      View Surveys
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default ProfilePage;
