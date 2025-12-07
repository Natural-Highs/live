import type React from 'react';
import { useCallback, useEffect, useState } from 'react';

interface Event {
  id: string;
  name: string;
  [key: string]: unknown;
}

interface QuestionResponse {
  id: string;
  questionId: string;
  responseText: string;
  [key: string]: unknown;
}

interface SurveyResponse {
  id: string;
  userId: string;
  surveyId: string;
  eventId?: string;
  isComplete: boolean;
  createdAt: Date | string | { toDate: () => Date };
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  } | null;
  survey: {
    id: string;
    name: string;
  } | null;
  questionResponses: QuestionResponse[];
  [key: string]: unknown;
}

const ResponsesPage: React.FC = () => {
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedResponse, setSelectedResponse] = useState<SurveyResponse | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const fetchEvents = useCallback(async () => {
    try {
      const response = await fetch('/api/events');
      const data = (await response.json()) as {
        success: boolean;
        events?: Event[];
        error?: string;
      };

      if (response.ok && data.success && data.events) {
        setEvents(data.events);
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    }
  }, []);

  const fetchResponses = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (selectedEventId) params.append('eventId', selectedEventId);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const url = `/api/admin/responses${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      const data = (await response.json()) as {
        success: boolean;
        responses?: SurveyResponse[];
        error?: string;
      };

      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to load responses');
        return;
      }

      if (data.responses) {
        // Convert Firestore timestamps to Date objects
        const processedResponses = data.responses.map(response => ({
          ...response,
          createdAt:
            typeof response.createdAt === 'object' && 'toDate' in response.createdAt
              ? response.createdAt.toDate()
              : new Date(response.createdAt),
        }));
        setResponses(processedResponses);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load responses');
    } finally {
      setLoading(false);
    }
  }, [selectedEventId, startDate, endDate]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    fetchResponses();
  }, [fetchResponses]);

  const handleExportCSV = () => {
    if (responses.length === 0) {
      alert('No responses to export');
      return;
    }

    // Create CSV header
    const headers = [
      'Response ID',
      'User Email',
      'User Name',
      'Survey Name',
      'Event ID',
      'Status',
      'Created At',
      'Question Responses',
    ];

    // Create CSV rows
    const rows = responses.map(response => {
      const userName = response.user
        ? `${response.user.firstName || ''} ${response.user.lastName || ''}`.trim() ||
          response.user.email
        : 'Unknown';
      const surveyName = response.survey?.name || 'Unknown';
      const status = response.isComplete ? 'Complete' : 'In Progress';
      const createdAt =
        response.createdAt instanceof Date
          ? response.createdAt.toISOString()
          : String(response.createdAt);
      const questionResponses = response.questionResponses
        .map(qr => `${qr.questionId}: ${qr.responseText}`)
        .join('; ');

      return [
        response.id,
        response.user?.email || '',
        userName,
        surveyName,
        response.eventId || '',
        status,
        createdAt,
        questionResponses,
      ];
    });

    // Combine headers and rows
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `survey-responses-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    if (responses.length === 0) {
      alert('No responses to export');
      return;
    }

    const jsonContent = JSON.stringify(responses, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `survey-responses-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const formatDate = (date: Date | string | { toDate: () => Date }): string => {
    let d: Date;
    if (date instanceof Date) {
      d = date;
    } else if (typeof date === 'object' && date !== null && 'toDate' in date) {
      d = (date as { toDate: () => Date }).toDate();
    } else {
      d = new Date(date as string);
    }
    return d.toLocaleString();
  };

  const handleViewDetails = (response: SurveyResponse) => {
    setSelectedResponse(response);
    setShowDetailsModal(true);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Survey Responses</h1>

      {/* Filters */}
      <div className="card bg-base-200 shadow-xl mb-4">
        <div className="card-body">
          <h2 className="card-title">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="form-control">
              <label className="label" htmlFor="filter-event">
                <span className="label-text">Event</span>
              </label>
              <select
                id="filter-event"
                className="select select-bordered"
                value={selectedEventId}
                onChange={e => setSelectedEventId(e.target.value)}
              >
                <option value="">All Events</option>
                {events.map(event => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-control">
              <label className="label" htmlFor="filter-start-date">
                <span className="label-text">Start Date</span>
              </label>
              <input
                id="filter-start-date"
                type="date"
                className="input input-bordered"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
            <div className="form-control">
              <label className="label" htmlFor="filter-end-date">
                <span className="label-text">End Date</span>
              </label>
              <input
                id="filter-end-date"
                type="date"
                className="input input-bordered"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div className="card-actions justify-end mt-4">
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => {
                setSelectedEventId('');
                setStartDate('');
                setEndDate('');
              }}
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleExportCSV}
          disabled={responses.length === 0}
        >
          Export CSV
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleExportJSON}
          disabled={responses.length === 0}
        >
          Export JSON
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center h-64">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      )}

      {/* Responses Table */}
      {!loading && (
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Responses ({responses.length})</h2>
            {responses.length === 0 ? (
              <p className="text-center py-8">No responses found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Survey</th>
                      <th>Event</th>
                      <th>Status</th>
                      <th>Created At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {responses.map(response => {
                      const userName = response.user
                        ? `${response.user.firstName || ''} ${response.user.lastName || ''}`.trim() ||
                          response.user.email
                        : 'Unknown';
                      return (
                        <tr key={response.id}>
                          <td>{userName}</td>
                          <td>{response.survey?.name || 'Unknown'}</td>
                          <td>{response.eventId || 'N/A'}</td>
                          <td>
                            <span
                              className={`badge ${
                                response.isComplete ? 'badge-success' : 'badge-warning'
                              }`}
                            >
                              {response.isComplete ? 'Complete' : 'In Progress'}
                            </span>
                          </td>
                          <td>{formatDate(response.createdAt)}</td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              onClick={() => handleViewDetails(response)}
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedResponse && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Response Details</h3>
            <div className="space-y-2">
              <p>
                <strong>Response ID:</strong> {selectedResponse.id}
              </p>
              <p>
                <strong>User:</strong>{' '}
                {selectedResponse.user
                  ? `${selectedResponse.user.firstName || ''} ${selectedResponse.user.lastName || ''}`.trim() ||
                    selectedResponse.user.email
                  : 'Unknown'}
              </p>
              <p>
                <strong>Email:</strong> {selectedResponse.user?.email || 'N/A'}
              </p>
              <p>
                <strong>Survey:</strong> {selectedResponse.survey?.name || 'Unknown'}
              </p>
              <p>
                <strong>Event ID:</strong> {selectedResponse.eventId || 'N/A'}
              </p>
              <p>
                <strong>Status:</strong>{' '}
                <span
                  className={`badge ${
                    selectedResponse.isComplete ? 'badge-success' : 'badge-warning'
                  }`}
                >
                  {selectedResponse.isComplete ? 'Complete' : 'In Progress'}
                </span>
              </p>
              <p>
                <strong>Created At:</strong> {formatDate(selectedResponse.createdAt)}
              </p>
              {selectedResponse.questionResponses.length > 0 && (
                <div>
                  <strong>Question Responses:</strong>
                  <div className="mt-2 space-y-2">
                    {selectedResponse.questionResponses.map(qr => (
                      <div key={qr.id || qr.questionId} className="bg-base-300 p-2 rounded">
                        <p className="font-semibold">Question {qr.questionId}:</p>
                        <p>{qr.responseText}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-action">
              <button type="button" className="btn" onClick={() => setShowDetailsModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResponsesPage;
