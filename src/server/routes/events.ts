import { Hono } from 'hono';
import { adminDb } from '$lib/firebase/firebase.admin';
import { type AuthContext, adminMiddleware, authMiddleware } from '../middleware/auth';
import type { EventCreationRequest, EventDocument, EventTypeData } from '../types/events';

const events = new Hono();

function generateUniqueEventCode(): string {
  const min = 1000;
  const max = 9999;
  return Math.floor(Math.random() * (max - min + 1) + min).toString();
}

async function generateUniqueEventCodeInDb(): Promise<string> {
  let code: string = '';
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 100;

  while (!isUnique && attempts < maxAttempts) {
    code = generateUniqueEventCode();
    const existingEvent = await adminDb.collection('events').where('code', '==', code).get();

    if (existingEvent.empty) {
      isUnique = true;
    } else {
      attempts++;
    }
  }

  if (!isUnique || !code) {
    throw new Error('Failed to generate unique event code after multiple attempts');
  }

  return code;
}

/**
 * POST /api/events
 * Create a new event (admin only)
 * Uses default templates from event type if not specified
 */
events.post('/', authMiddleware, adminMiddleware, async (c: AuthContext) => {
  try {
    const requestData = (await c.req.json()) as EventCreationRequest;
    const {
      name,
      eventTypeId,
      eventDate,
      consentFormTemplateId,
      demographicsFormTemplateId,
      surveyTemplateId,
    } = requestData;

    if (!name || !eventTypeId || !eventDate) {
      return c.json(
        {
          success: false,
          error: 'Name, event type, and event date are required',
        },
        400
      );
    }

    let finalConsentTemplateId = consentFormTemplateId;
    let finalDemographicsTemplateId = demographicsFormTemplateId;
    let finalSurveyTemplateId = surveyTemplateId;

    if (!finalConsentTemplateId || !finalDemographicsTemplateId) {
      const eventTypeRef = adminDb.collection('eventTypes').doc(eventTypeId);
      const eventTypeDoc = await eventTypeRef.get();

      if (!eventTypeDoc.exists) {
        return c.json({ success: false, error: 'Event type not found' }, 404);
      }

      const eventTypeData = eventTypeDoc.data() as EventTypeData | undefined;
      if (!finalConsentTemplateId) {
        finalConsentTemplateId = eventTypeData?.defaultConsentFormTemplateId;
      }
      if (!finalDemographicsTemplateId) {
        finalDemographicsTemplateId = eventTypeData?.defaultDemographicsFormTemplateId;
      }
      if (!finalSurveyTemplateId) {
        finalSurveyTemplateId = eventTypeData?.defaultSurveyTemplateId || null;
      }
    }

    const eventData = {
      name,
      eventTypeId,
      eventDate: new Date(eventDate),
      consentFormTemplateId: finalConsentTemplateId,
      demographicsFormTemplateId: finalDemographicsTemplateId,
      surveyTemplateId: finalSurveyTemplateId,
      isActive: false,
      code: null,
      activatedAt: null,
      surveyAccessibleAt: null,
      surveyAccessibleOverride: false,
      createdAt: new Date(),
      createdBy: c.get('user')?.uid,
    };

    const eventRef = await adminDb.collection('events').add(eventData);

    const createdEvent = { ...eventData, id: eventRef.id } as EventDocument;
    return c.json({
      success: true,
      eventId: eventRef.id,
      data: createdEvent,
    });
  } catch (error: unknown) {
    console.error('Create event error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create event',
      },
      500
    );
  }
});

/**
 * GET /api/events
 * List events (filtered by user/admin)
 */
events.get('/', authMiddleware, async (c: AuthContext) => {
  try {
    const user = c.get('user');
    const isAdmin = user?.admin || false;

    let eventsQuery: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> =
      adminDb.collection('events');

    if (!isAdmin) {
      eventsQuery = eventsQuery.where('isActive', '==', true);
    }

    const eventsSnapshot = await eventsQuery.get();

    const eventsData = eventsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return c.json({ success: true, events: eventsData });
  } catch (error: unknown) {
    console.error('Get events error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get events',
      },
      500
    );
  }
});

/**
 * POST /api/events/:id/activate
 * Activate event and generate unique 4-digit code (admin only)
 */
events.post('/:id/activate', authMiddleware, adminMiddleware, async (c: AuthContext) => {
  try {
    const eventId = c.req.param('id');

    const eventRef = adminDb.collection('events').doc(eventId);
    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) {
      return c.json({ success: false, error: 'Event not found' }, 404);
    }

    const eventData = eventDoc.data();
    if (eventData?.isActive) {
      return c.json({ success: false, error: 'Event is already active' }, 400);
    }

    const uniqueCode = await generateUniqueEventCodeInDb();
    const activatedAt = new Date();
    const surveyAccessibleAt = new Date(activatedAt.getTime() + 60 * 60 * 1000);

    await eventRef.update({
      isActive: true,
      code: uniqueCode,
      activatedAt,
      surveyAccessibleAt,
    });

    return c.json({
      success: true,
      code: uniqueCode,
      activatedAt,
      surveyAccessibleAt,
    });
  } catch (error: unknown) {
    console.error('Activate event error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to activate event',
      },
      500
    );
  }
});

/**
 * POST /api/events/:id/override
 * Manually override event to make surveys accessible immediately (admin only)
 */
events.post('/:id/override', authMiddleware, adminMiddleware, async (c: AuthContext) => {
  try {
    const eventId = c.req.param('id');

    const eventRef = adminDb.collection('events').doc(eventId);
    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) {
      return c.json({ success: false, error: 'Event not found' }, 404);
    }

    await eventRef.update({
      surveyAccessibleOverride: true,
      surveyAccessibleAt: new Date(),
    });

    return c.json({ success: true });
  } catch (error: unknown) {
    console.error('Override event error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to override event',
      },
      500
    );
  }
});

/**
 * GET /api/events/:id/surveys
 * Get accessible surveys for event (with timing logic: 1 hour after activation or override)
 */
events.get('/:id/surveys', authMiddleware, async (c: AuthContext) => {
  try {
    const eventId = c.req.param('id');

    const eventRef = adminDb.collection('events').doc(eventId);
    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) {
      return c.json({ success: false, error: 'Event not found' }, 404);
    }

    const eventData = eventDoc.data();
    const now = new Date();

    const isSurveyAccessible =
      eventData?.surveyAccessibleOverride ||
      (eventData?.surveyAccessibleAt && new Date(eventData.surveyAccessibleAt.toDate()) <= now);

    if (!isSurveyAccessible) {
      return c.json({
        success: true,
        surveys: [],
        message: 'Surveys not yet accessible',
        accessibleAt: eventData?.surveyAccessibleAt,
      });
    }

    if (!eventData?.surveyTemplateId) {
      return c.json({ success: true, surveys: [] });
    }

    const surveyRef = adminDb.collection('surveys').doc(eventData.surveyTemplateId);
    const surveyDoc = await surveyRef.get();

    if (!surveyDoc.exists) {
      return c.json({ success: true, surveys: [] });
    }

    return c.json({
      success: true,
      surveys: [
        {
          id: surveyDoc.id,
          ...surveyDoc.data(),
        },
      ],
    });
  } catch (error: unknown) {
    console.error('Get event surveys error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get event surveys',
      },
      500
    );
  }
});

export default events;
