import type React from 'react';
import { useCallback, useEffect, useState } from 'react';

type FormTemplateType = 'consent' | 'demographics' | 'survey';

interface FormTemplate {
  id: string;
  type: FormTemplateType;
  name: string;
  description?: string;
  [key: string]: unknown;
}

interface EventType {
  id: string;
  name: string;
  defaultConsentFormTemplateId?: string;
  defaultDemographicsFormTemplateId?: string;
  defaultSurveyTemplateId?: string | null;
  createdAt?: Date | string;
  [key: string]: unknown;
}

interface Event {
  id: string;
  name: string;
  eventTypeId: string;
  eventDate: Date | string;
  consentFormTemplateId: string;
  demographicsFormTemplateId: string;
  surveyTemplateId: string | null;
  collectAdditionalDemographics?: boolean;
  isActive: boolean;
  code: string | null;
  activatedAt: Date | string | null;
  surveyAccessibleAt: Date | string | null;
  surveyAccessibleOverride: boolean;
  createdAt?: Date | string;
  [key: string]: unknown;
}

const EventsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'events' | 'eventTypes'>('events');
  const [events, setEvents] = useState<Event[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [showCreateEventTypeModal, setShowCreateEventTypeModal] = useState(false);
  const [showEditEventTypeModal, setShowEditEventTypeModal] = useState(false);
  const [showDeleteEventTypeModal, setShowDeleteEventTypeModal] = useState(false);
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null);
  const [eventFormData, setEventFormData] = useState({
    name: '',
    eventTypeId: '',
    eventDate: '',
    consentFormTemplateId: '',
    demographicsFormTemplateId: '',
    surveyTemplateId: '',
    collectAdditionalDemographics: false,
  });
  const [eventTypeFormData, setEventTypeFormData] = useState({
    name: '',
    defaultConsentFormTemplateId: '',
    defaultDemographicsFormTemplateId: '',
    defaultSurveyTemplateId: '',
  });

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError('');
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
  }, []);

  const fetchEventTypes = useCallback(async () => {
    setError('');
    try {
      const response = await fetch('/api/eventTypes');
      const data = (await response.json()) as {
        success: boolean;
        eventTypes?: EventType[];
        error?: string;
      };

      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to load event types');
        return;
      }

      if (data.eventTypes) {
        setEventTypes(data.eventTypes);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load event types');
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await fetch('/api/formTemplates');
      const data = (await response.json()) as {
        success: boolean;
        templates?: FormTemplate[];
        error?: string;
      };

      if (response.ok && data.success && data.templates) {
        setTemplates(data.templates);
      }
    } catch (_err) {
      // Silently fail - templates are optional
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    fetchEventTypes();
    fetchTemplates();
  }, [fetchEvents, fetchEventTypes, fetchTemplates]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: eventFormData.name,
          eventTypeId: eventFormData.eventTypeId,
          eventDate: eventFormData.eventDate,
          consentFormTemplateId: eventFormData.consentFormTemplateId || undefined,
          demographicsFormTemplateId: eventFormData.demographicsFormTemplateId || undefined,
          surveyTemplateId: eventFormData.surveyTemplateId || null,
          collectAdditionalDemographics: eventFormData.collectAdditionalDemographics,
        }),
      });

      const data = (await response.json()) as {
        success: boolean;
        error?: string;
      };

      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to create event');
        return;
      }

      setShowCreateEventModal(false);
      setEventFormData({
        name: '',
        eventTypeId: '',
        eventDate: '',
        consentFormTemplateId: '',
        demographicsFormTemplateId: '',
        surveyTemplateId: '',
        collectAdditionalDemographics: false,
      });
      await fetchEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event');
    }
  };

  const handleCreateEventType = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('/api/eventTypes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: eventTypeFormData.name,
          defaultConsentFormTemplateId: eventTypeFormData.defaultConsentFormTemplateId,
          defaultDemographicsFormTemplateId: eventTypeFormData.defaultDemographicsFormTemplateId,
          defaultSurveyTemplateId: eventTypeFormData.defaultSurveyTemplateId || null,
        }),
      });

      const data = (await response.json()) as {
        success: boolean;
        error?: string;
      };

      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to create event type');
        return;
      }

      setShowCreateEventTypeModal(false);
      setEventTypeFormData({
        name: '',
        defaultConsentFormTemplateId: '',
        defaultDemographicsFormTemplateId: '',
        defaultSurveyTemplateId: '',
      });
      await fetchEventTypes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event type');
    }
  };

  const handleUpdateEventType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventType) return;

    setError('');

    try {
      const response = await fetch(`/api/eventTypes/${selectedEventType.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: eventTypeFormData.name,
          defaultConsentFormTemplateId: eventTypeFormData.defaultConsentFormTemplateId,
          defaultDemographicsFormTemplateId: eventTypeFormData.defaultDemographicsFormTemplateId,
          defaultSurveyTemplateId: eventTypeFormData.defaultSurveyTemplateId || null,
        }),
      });

      const data = (await response.json()) as {
        success: boolean;
        error?: string;
      };

      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to update event type');
        return;
      }

      setShowEditEventTypeModal(false);
      setSelectedEventType(null);
      await fetchEventTypes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update event type');
    }
  };

  const handleDeleteEventType = async () => {
    if (!selectedEventType) return;

    setError('');

    try {
      const response = await fetch(`/api/eventTypes/${selectedEventType.id}`, {
        method: 'DELETE',
      });

      const data = (await response.json()) as {
        success: boolean;
        error?: string;
      };

      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to delete event type');
        return;
      }

      setShowDeleteEventTypeModal(false);
      setSelectedEventType(null);
      await fetchEventTypes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete event type');
    }
  };

  const handleActivateEvent = async () => {
    if (!selectedEvent) return;

    setError('');

    try {
      const response = await fetch(`/api/events/${selectedEvent.id}/activate`, {
        method: 'POST',
      });

      const data = (await response.json()) as {
        success: boolean;
        code?: string;
        activatedAt?: string;
        surveyAccessibleAt?: string;
        error?: string;
      };

      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to activate event');
        return;
      }

      await fetchEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate event');
    }
  };

  const handleOverrideSurvey = async (eventId: string) => {
    setError('');

    try {
      const response = await fetch(`/api/events/${eventId}/override`, {
        method: 'POST',
      });

      const data = (await response.json()) as {
        success: boolean;
        error?: string;
      };

      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to override survey timing');
        return;
      }

      await fetchEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to override survey timing');
    }
  };

  const openEditEventTypeModal = (eventType: EventType) => {
    setSelectedEventType(eventType);
    setEventTypeFormData({
      name: eventType.name,
      defaultConsentFormTemplateId: eventType.defaultConsentFormTemplateId || '',
      defaultDemographicsFormTemplateId: eventType.defaultDemographicsFormTemplateId || '',
      defaultSurveyTemplateId: eventType.defaultSurveyTemplateId || '',
    });
    setShowEditEventTypeModal(true);
  };

  const openDeleteEventTypeModal = (eventType: EventType) => {
    setSelectedEventType(eventType);
    setShowDeleteEventTypeModal(true);
  };

  const openActivateModal = (event: Event) => {
    setSelectedEvent(event);
    setShowActivateModal(true);
  };

  const loadEventTypeDefaults = (eventTypeId: string) => {
    const eventType = eventTypes.find(et => et.id === eventTypeId);
    if (eventType) {
      setEventFormData({
        ...eventFormData,
        consentFormTemplateId: eventType.defaultConsentFormTemplateId || '',
        demographicsFormTemplateId: eventType.defaultDemographicsFormTemplateId || '',
        surveyTemplateId: eventType.defaultSurveyTemplateId || '',
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatDate = (date: Date | string | null | undefined): string => {
    if (!date) return 'N/A';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString();
  };

  const formatDateTime = (date: Date | string | null | undefined): string => {
    if (!date) return 'N/A';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString();
  };

  const consentTemplates = templates.filter(t => t.type === 'consent');
  const demographicsTemplates = templates.filter(t => t.type === 'demographics');
  const surveyTemplates = templates.filter(t => t.type === 'survey');

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Events Management</h1>
        {activeTab === 'events' && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowCreateEventModal(true)}
          >
            Create Event
          </button>
        )}
        {activeTab === 'eventTypes' && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowCreateEventTypeModal(true)}
          >
            Create Event Type
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="tabs tabs-boxed mb-4">
        <button
          type="button"
          className={`tab ${activeTab === 'events' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('events')}
        >
          Events
        </button>
        <button
          type="button"
          className={`tab ${activeTab === 'eventTypes' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('eventTypes')}
        >
          Event Types
        </button>
      </div>

      {/* Events Tab */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          {events.length === 0 ? (
            <div className="alert alert-info">
              <span>No events found. Create your first event to get started.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Additional Demographics</th>
                    <th>Code</th>
                    <th>Activated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map(event => {
                    const eventType = eventTypes.find(et => et.id === event.eventTypeId);
                    return (
                      <tr key={event.id}>
                        <td>{event.name}</td>
                        <td>{eventType?.name || 'Unknown'}</td>
                        <td>{formatDate(event.eventDate)}</td>
                        <td>
                          {event.isActive ? (
                            <span className="badge badge-success">Active</span>
                          ) : (
                            <span className="badge badge-error">Inactive</span>
                          )}
                        </td>
                        <td>
                          {event.collectAdditionalDemographics ? (
                            <span className="badge badge-info">Enabled</span>
                          ) : (
                            <span className="badge badge-ghost">Disabled</span>
                          )}
                        </td>
                        <td>
                          {event.code ? (
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold">{event.code}</span>
                              <button
                                type="button"
                                className="btn btn-xs"
                                onClick={() => copyToClipboard(event.code || '')}
                                title="Copy to clipboard"
                              >
                                Copy
                              </button>
                            </div>
                          ) : (
                            <span className="text-sm opacity-60">Not activated</span>
                          )}
                        </td>
                        <td>{formatDateTime(event.activatedAt)}</td>
                        <td>
                          <div className="flex gap-2">
                            {!event.isActive && (
                              <button
                                type="button"
                                className="btn btn-sm btn-primary"
                                onClick={() => openActivateModal(event)}
                              >
                                Activate
                              </button>
                            )}
                            {event.isActive && !event.surveyAccessibleOverride && (
                              <button
                                type="button"
                                className="btn btn-sm btn-warning"
                                onClick={() => handleOverrideSurvey(event.id)}
                              >
                                Make Surveys Accessible Now
                              </button>
                            )}
                            {event.surveyAccessibleOverride && (
                              <span className="badge badge-warning">Override Active</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Event Types Tab */}
      {activeTab === 'eventTypes' && (
        <div className="space-y-4">
          {eventTypes.length === 0 ? (
            <div className="alert alert-info">
              <span>No event types found. Create your first event type to get started.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {eventTypes.map(eventType => {
                const consentTemplate = templates.find(
                  t => t.id === eventType.defaultConsentFormTemplateId
                );
                const demographicsTemplate = templates.find(
                  t => t.id === eventType.defaultDemographicsFormTemplateId
                );
                const surveyTemplate = templates.find(
                  t => t.id === eventType.defaultSurveyTemplateId
                );

                return (
                  <div key={eventType.id} className="card bg-base-200 shadow-xl">
                    <div className="card-body">
                      <h3 className="card-title">{eventType.name}</h3>
                      <div className="text-sm space-y-1">
                        <p>
                          <span className="font-semibold">Consent:</span>{' '}
                          {consentTemplate?.name || 'Not set'}
                        </p>
                        <p>
                          <span className="font-semibold">Demographics:</span>{' '}
                          {demographicsTemplate?.name || 'Not set'}
                        </p>
                        <p>
                          <span className="font-semibold">Survey:</span>{' '}
                          {surveyTemplate?.name || 'Not set'}
                        </p>
                      </div>
                      <div className="card-actions justify-end mt-4">
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => openEditEventTypeModal(eventType)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-error"
                          onClick={() => openDeleteEventTypeModal(eventType)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create Event Modal */}
      {showCreateEventModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Create Event</h3>
            <form onSubmit={handleCreateEvent}>
              <div className="form-control mb-4">
                <label htmlFor="event-name" className="label">
                  <span className="label-text">Name</span>
                </label>
                <input
                  id="event-name"
                  type="text"
                  className="input input-bordered w-full"
                  value={eventFormData.name}
                  onChange={e => setEventFormData({ ...eventFormData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-control mb-4">
                <label htmlFor="event-type" className="label">
                  <span className="label-text">Event Type</span>
                </label>
                <select
                  id="event-type"
                  className="select select-bordered w-full"
                  value={eventFormData.eventTypeId}
                  onChange={e => {
                    setEventFormData({
                      ...eventFormData,
                      eventTypeId: e.target.value,
                    });
                    loadEventTypeDefaults(e.target.value);
                  }}
                  required
                >
                  <option value="">Select event type</option>
                  {eventTypes.map(et => (
                    <option key={et.id} value={et.id}>
                      {et.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-control mb-4">
                <label htmlFor="event-date" className="label">
                  <span className="label-text">Event Date</span>
                </label>
                <input
                  id="event-date"
                  type="date"
                  className="input input-bordered w-full"
                  value={eventFormData.eventDate}
                  onChange={e => setEventFormData({ ...eventFormData, eventDate: e.target.value })}
                  required
                />
              </div>
              <div className="form-control mb-4">
                <label htmlFor="event-consent" className="label">
                  <span className="label-text">
                    Consent Form (optional, uses default if not set)
                  </span>
                </label>
                <select
                  id="event-consent"
                  className="select select-bordered w-full"
                  value={eventFormData.consentFormTemplateId}
                  onChange={e =>
                    setEventFormData({
                      ...eventFormData,
                      consentFormTemplateId: e.target.value,
                    })
                  }
                >
                  <option value="">Use default from event type</option>
                  {consentTemplates.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-control mb-4">
                <label htmlFor="event-demographics" className="label">
                  <span className="label-text">
                    Demographics Form (optional, uses default if not set)
                  </span>
                </label>
                <select
                  id="event-demographics"
                  className="select select-bordered w-full"
                  value={eventFormData.demographicsFormTemplateId}
                  onChange={e =>
                    setEventFormData({
                      ...eventFormData,
                      demographicsFormTemplateId: e.target.value,
                    })
                  }
                >
                  <option value="">Use default from event type</option>
                  {demographicsTemplates.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-control mb-4">
                <label htmlFor="event-survey" className="label">
                  <span className="label-text">
                    Survey Form (optional, uses default if not set)
                  </span>
                </label>
                <select
                  id="event-survey"
                  className="select select-bordered w-full"
                  value={eventFormData.surveyTemplateId}
                  onChange={e =>
                    setEventFormData({
                      ...eventFormData,
                      surveyTemplateId: e.target.value,
                    })
                  }
                >
                  <option value="">Use default from event type</option>
                  {surveyTemplates.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-control mb-4">
                <label className="label cursor-pointer justify-start">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary mr-2"
                    checked={eventFormData.collectAdditionalDemographics}
                    onChange={e =>
                      setEventFormData({
                        ...eventFormData,
                        collectAdditionalDemographics: e.target.checked,
                      })
                    }
                  />
                  <span className="label-text">
                    Collect Additional Demographics
                    <span
                      className="tooltip tooltip-right ml-1"
                      data-tip="When enabled, the demographics form will include additional fields for sexual orientation, gender identity, and other demographics as configured in the form template."
                    >
                      <span className="text-info">ℹ️</span>
                    </span>
                  </span>
                </label>
              </div>
              <div className="modal-action">
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setShowCreateEventModal(false);
                    setEventFormData({
                      name: '',
                      eventTypeId: '',
                      eventDate: '',
                      consentFormTemplateId: '',
                      demographicsFormTemplateId: '',
                      surveyTemplateId: '',
                      collectAdditionalDemographics: false,
                    });
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Event Type Modal */}
      {showCreateEventTypeModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Create Event Type</h3>
            <form onSubmit={handleCreateEventType}>
              <div className="form-control mb-4">
                <label htmlFor="event-type-name" className="label">
                  <span className="label-text">Name</span>
                </label>
                <input
                  id="event-type-name"
                  type="text"
                  className="input input-bordered w-full"
                  value={eventTypeFormData.name}
                  onChange={e =>
                    setEventTypeFormData({
                      ...eventTypeFormData,
                      name: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="form-control mb-4">
                <label htmlFor="event-type-consent" className="label">
                  <span className="label-text">Default Consent Form</span>
                </label>
                <select
                  id="event-type-consent"
                  className="select select-bordered w-full"
                  value={eventTypeFormData.defaultConsentFormTemplateId}
                  onChange={e =>
                    setEventTypeFormData({
                      ...eventTypeFormData,
                      defaultConsentFormTemplateId: e.target.value,
                    })
                  }
                  required
                >
                  <option value="">Select consent form</option>
                  {consentTemplates.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-control mb-4">
                <label htmlFor="event-type-demographics" className="label">
                  <span className="label-text">Default Demographics Form</span>
                </label>
                <select
                  id="event-type-demographics"
                  className="select select-bordered w-full"
                  value={eventTypeFormData.defaultDemographicsFormTemplateId}
                  onChange={e =>
                    setEventTypeFormData({
                      ...eventTypeFormData,
                      defaultDemographicsFormTemplateId: e.target.value,
                    })
                  }
                  required
                >
                  <option value="">Select demographics form</option>
                  {demographicsTemplates.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-control mb-4">
                <label htmlFor="event-type-survey" className="label">
                  <span className="label-text">Default Survey Form (optional)</span>
                </label>
                <select
                  id="event-type-survey"
                  className="select select-bordered w-full"
                  value={eventTypeFormData.defaultSurveyTemplateId}
                  onChange={e =>
                    setEventTypeFormData({
                      ...eventTypeFormData,
                      defaultSurveyTemplateId: e.target.value,
                    })
                  }
                >
                  <option value="">No default survey</option>
                  {surveyTemplates.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="modal-action">
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setShowCreateEventTypeModal(false);
                    setEventTypeFormData({
                      name: '',
                      defaultConsentFormTemplateId: '',
                      defaultDemographicsFormTemplateId: '',
                      defaultSurveyTemplateId: '',
                    });
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Event Type Modal */}
      {showEditEventTypeModal && selectedEventType && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Edit Event Type</h3>
            <form onSubmit={handleUpdateEventType}>
              <div className="form-control mb-4">
                <label htmlFor="edit-event-type-name" className="label">
                  <span className="label-text">Name</span>
                </label>
                <input
                  id="edit-event-type-name"
                  type="text"
                  className="input input-bordered w-full"
                  value={eventTypeFormData.name}
                  onChange={e =>
                    setEventTypeFormData({
                      ...eventTypeFormData,
                      name: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="form-control mb-4">
                <label htmlFor="edit-event-type-consent" className="label">
                  <span className="label-text">Default Consent Form</span>
                </label>
                <select
                  id="edit-event-type-consent"
                  className="select select-bordered w-full"
                  value={eventTypeFormData.defaultConsentFormTemplateId}
                  onChange={e =>
                    setEventTypeFormData({
                      ...eventTypeFormData,
                      defaultConsentFormTemplateId: e.target.value,
                    })
                  }
                  required
                >
                  <option value="">Select consent form</option>
                  {consentTemplates.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-control mb-4">
                <label htmlFor="edit-event-type-demographics" className="label">
                  <span className="label-text">Default Demographics Form</span>
                </label>
                <select
                  id="edit-event-type-demographics"
                  className="select select-bordered w-full"
                  value={eventTypeFormData.defaultDemographicsFormTemplateId}
                  onChange={e =>
                    setEventTypeFormData({
                      ...eventTypeFormData,
                      defaultDemographicsFormTemplateId: e.target.value,
                    })
                  }
                  required
                >
                  <option value="">Select demographics form</option>
                  {demographicsTemplates.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-control mb-4">
                <label htmlFor="edit-event-type-survey" className="label">
                  <span className="label-text">Default Survey Form (optional)</span>
                </label>
                <select
                  id="edit-event-type-survey"
                  className="select select-bordered w-full"
                  value={eventTypeFormData.defaultSurveyTemplateId}
                  onChange={e =>
                    setEventTypeFormData({
                      ...eventTypeFormData,
                      defaultSurveyTemplateId: e.target.value,
                    })
                  }
                >
                  <option value="">No default survey</option>
                  {surveyTemplates.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="modal-action">
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setShowEditEventTypeModal(false);
                    setSelectedEventType(null);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Event Type Modal */}
      {showDeleteEventTypeModal && selectedEventType && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Delete Event Type</h3>
            <p className="mb-4">
              Are you sure you want to delete &quot;{selectedEventType.name}&quot;? This action
              cannot be undone.
            </p>
            <div className="modal-action">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setShowDeleteEventTypeModal(false);
                  setSelectedEventType(null);
                }}
              >
                Cancel
              </button>
              <button type="button" className="btn btn-error" onClick={handleDeleteEventType}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activate Event Modal */}
      {showActivateModal && selectedEvent && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Activate Event</h3>
            <p className="mb-4">
              Activating &quot;{selectedEvent.name}&quot; will generate a unique 4-digit code that
              participants can use to register for this event.
            </p>
            {selectedEvent.code && (
              <div className="alert alert-info mb-4">
                <div className="flex items-center gap-2">
                  <span>Event Code:</span>
                  <span className="font-mono font-bold text-lg">{selectedEvent.code}</span>
                  <button
                    type="button"
                    className="btn btn-xs"
                    onClick={() => copyToClipboard(selectedEvent.code || '')}
                  >
                    Copy
                  </button>
                </div>
                {selectedEvent.activatedAt && (
                  <p className="text-sm mt-2">
                    Activated: {formatDateTime(selectedEvent.activatedAt)}
                  </p>
                )}
                {selectedEvent.surveyAccessibleAt && (
                  <p className="text-sm">
                    Surveys accessible: {formatDateTime(selectedEvent.surveyAccessibleAt)}
                  </p>
                )}
              </div>
            )}
            <div className="modal-action">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setShowActivateModal(false);
                  setSelectedEvent(null);
                }}
              >
                {selectedEvent.code ? 'Close' : 'Cancel'}
              </button>
              {!selectedEvent.code && (
                <button type="button" className="btn btn-primary" onClick={handleActivateEvent}>
                  Activate
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsPage;
