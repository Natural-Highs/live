import type React from 'react';
import { useEffect, useState } from 'react';
import { PageContainer } from '@/components/ui/page-container';
import { WebsiteLogo } from '@/components/ui/website-logo';
import Greencard from '@/components/ui/GreenCard';
import GrnButton from '@/components/ui/GrnButton';
import GreyButton from '@/components/ui/GreyButton';
import Titlecard from '@/components/ui/TitleCard';
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
  //const { user } = useAuth();
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
      setError(err instanceof Error ? err.message : 'Failed to register for event');
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
        {/* Header with Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg">
            <WebsiteLogo size="lg" />
          </div>
          <h1 className="text-4xl font-serif text-gray-800 border-b-2 border-gray-800 pb-2">
            Home
          </h1>
        </div>

        {/* Check In Section */}
        
        <Titlecard>
          <h1>Check In</h1>
        </Titlecard>

        <Greencard>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-lg mb-3 text-sm text-center">
              {error}
            </div>
          )}

          {success && (
            <div className="text-center text-green-800 italic mb-3">
              <p className="font-semibold">Success!</p>
              <p>You've checked in</p>
            </div>
          )}

          <form onSubmit={handleEventCodeSubmit}>
            <input
              style={{borderColor:'green', borderWidth:'2px'}}
              type="text"
              value={eventCode}
              onChange={(e) => setEventCode(e.target.value)}
              placeholder="Enter 4-digit code"
              maxLength={4}
              className="w-full bg-white rounded-lg px-4 py-3 text-center text-xl text-gray-700 mb-4 focus:outline-none focus:ring-2 focus:ring-green-600 tracking-widest"
              required
            />

            <GrnButton
              type="submit"
              disabled={submittingCode || eventCode.length !== 4}            >
              {submittingCode ? 'Registering...' : 'Submit'}
            </GrnButton>
          </form>
        </Greencard>

        {/* Navigation Buttons */}
        <div className="text-center space-y-3 w-1/5">
          <GreyButton
            type='button'
            onClick={() => console.log('Account Information')}
          >
            Account Information
          </GreyButton>

          <GreyButton
            type='button'
            onClick={() => console.log('Feedback Forms')}
          >
            Feedback Forms
          </GreyButton>

          <GreyButton
            type='button'
            onClick={() => console.log('Acudetox Form')}
          >
            Acudetox Form
          </GreyButton>

          <button
            type="button"
            onClick={() => console.log('Download Consent Form')}
            className="text-center w-full text-gray-700 text-sm pt-2 underline cursor-pointer hover:text-gray-900 bg-transparent"
          >
            Download Consent Form
          </button>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-gray-600 text-sm">
          <p>naturalhighs.org</p>
        </div>

        {/* My Events Section - Hidden by default, can be toggled */}
        {events.length > 0 && (
          <div className="mt-8 bg-white rounded-2xl p-6 shadow-md">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">My Events</h2>
            <div className="space-y-3">
              {events.map(event => (
                <div key={event.id} className="bg-gray-100 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800">{event.name}</h3>
                  <p className="text-sm text-gray-600">
                    Date: {formatDate(event.eventDate as string | undefined)}
                  </p>
                  {event.code && <p className="text-sm text-gray-600">Code: {event.code}</p>}
                  <button
                    type="button"
                    className="mt-2 text-sm text-green-700 hover:text-green-800 font-semibold"
                    onClick={() => {
                      console.log('Event clicked:', event.id);
                    }}
                  >
                    View Details →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
    </PageContainer>
  );
};

export default DashboardPage;
