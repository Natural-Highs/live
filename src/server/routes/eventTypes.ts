import { Hono } from 'hono';
import { adminDb } from '$lib/firebase/firebase.admin';
import { type AuthContext, adminMiddleware, authMiddleware } from '../middleware/auth';
import type { EventTypeCreationRequest, EventTypeUpdateRequest } from '../types/eventTypes';
import type { EventTypeUpdateData } from '../types/updateData';

const eventTypes = new Hono();

eventTypes.use('*', authMiddleware);
eventTypes.use('*', adminMiddleware);

/**
 * GET /api/eventTypes
 * List all event types
 */
eventTypes.get('/', async (c: AuthContext) => {
  try {
    const eventTypesSnapshot = await adminDb.collection('eventTypes').get();

    const eventTypesData = eventTypesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return c.json({ success: true, eventTypes: eventTypesData });
  } catch (error: unknown) {
    console.error('Get event types error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get event types',
      },
      500
    );
  }
});

/**
 * GET /api/eventTypes/:id
 * Get a specific event type
 */
eventTypes.get('/:id', async (c: AuthContext) => {
  try {
    const eventTypeId = c.req.param('id');

    const eventTypeRef = adminDb.collection('eventTypes').doc(eventTypeId);
    const eventTypeDoc = await eventTypeRef.get();

    if (!eventTypeDoc.exists) {
      return c.json({ success: false, error: 'Event type not found' }, 404);
    }

    return c.json({
      success: true,
      eventType: {
        id: eventTypeDoc.id,
        ...eventTypeDoc.data(),
      },
    });
  } catch (error: unknown) {
    console.error('Get event type error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get event type',
      },
      500
    );
  }
});

/**
 * POST /api/eventTypes
 * Create a new event type (admin only)
 */
eventTypes.post('/', async (c: AuthContext) => {
  try {
    const requestData = (await c.req.json()) as EventTypeCreationRequest;
    const {
      name,
      defaultConsentFormTemplateId,
      defaultDemographicsFormTemplateId,
      defaultSurveyTemplateId,
    } = requestData;

    if (!name) {
      return c.json({ success: false, error: 'Name is required' }, 400);
    }

    if (!defaultConsentFormTemplateId || !defaultDemographicsFormTemplateId) {
      return c.json(
        {
          success: false,
          error: 'Default consent form and demographics form templates are required',
        },
        400
      );
    }

    const eventTypeData = {
      name,
      defaultConsentFormTemplateId,
      defaultDemographicsFormTemplateId,
      defaultSurveyTemplateId: defaultSurveyTemplateId || null,
      createdAt: new Date(),
      createdBy: c.get('user')?.uid,
    };

    const eventTypeRef = await adminDb.collection('eventTypes').add(eventTypeData);

    return c.json({
      success: true,
      eventTypeId: eventTypeRef.id,
      eventType: { ...eventTypeData, id: eventTypeRef.id },
    });
  } catch (error: unknown) {
    console.error('Create event type error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create event type',
      },
      500
    );
  }
});

/**
 * PATCH /api/eventTypes/:id
 * Update an event type (admin only)
 */
eventTypes.patch('/:id', async (c: AuthContext) => {
  try {
    const eventTypeId = c.req.param('id');
    const requestData = (await c.req.json()) as EventTypeUpdateRequest;
    const {
      name,
      defaultConsentFormTemplateId,
      defaultDemographicsFormTemplateId,
      defaultSurveyTemplateId,
    } = requestData;

    const eventTypeRef = adminDb.collection('eventTypes').doc(eventTypeId);
    const eventTypeDoc = await eventTypeRef.get();

    if (!eventTypeDoc.exists) {
      return c.json({ success: false, error: 'Event type not found' }, 404);
    }

    const updateData: EventTypeUpdateData = {
      updatedAt: new Date(),
      updatedBy: c.get('user')?.uid,
    };

    if (name !== undefined) updateData.name = name;
    if (defaultConsentFormTemplateId !== undefined)
      updateData.defaultConsentFormTemplateId = defaultConsentFormTemplateId;
    if (defaultDemographicsFormTemplateId !== undefined)
      updateData.defaultDemographicsFormTemplateId = defaultDemographicsFormTemplateId;
    if (defaultSurveyTemplateId !== undefined)
      updateData.defaultSurveyTemplateId = defaultSurveyTemplateId;

    await eventTypeRef.update(updateData as unknown as Record<string, unknown>);

    return c.json({ success: true });
  } catch (error: unknown) {
    console.error('Update event type error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update event type',
      },
      500
    );
  }
});

/**
 * DELETE /api/eventTypes/:id
 * Delete an event type (admin only)
 */
eventTypes.delete('/:id', async (c: AuthContext) => {
  try {
    const eventTypeId = c.req.param('id');

    const eventTypeRef = adminDb.collection('eventTypes').doc(eventTypeId);
    const eventTypeDoc = await eventTypeRef.get();

    if (!eventTypeDoc.exists) {
      return c.json({ success: false, error: 'Event type not found' }, 404);
    }

    await eventTypeRef.delete();

    return c.json({ success: true });
  } catch (error: unknown) {
    console.error('Delete event type error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete event type',
      },
      500
    );
  }
});

export default eventTypes;
