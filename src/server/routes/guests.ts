import { Hono } from 'hono';
import { adminDb } from '$lib/firebase/firebase.admin';
import type { GuestCodeValidationRequest, GuestRegistrationRequest } from '../types/guests';

const guests = new Hono();

/**
 * POST /api/guests/validateCode
 * Validate event code and return event info (public endpoint for guest login flow)
 */
guests.post('/validateCode', async c => {
  try {
    const requestData = (await c.req.json()) as GuestCodeValidationRequest;
    const { eventCode } = requestData;

    if (!eventCode) {
      return c.json({ success: false, error: 'Event code is required' }, 400);
    }

    const eventsRef = adminDb.collection('events');
    const eventSnapshot = await eventsRef.where('code', '==', eventCode).get();

    if (eventSnapshot.empty) {
      return c.json({ success: false, error: 'Invalid event code' }, 404);
    }

    const eventDoc = eventSnapshot.docs[0];
    const eventData = eventDoc.data();

    if (!eventData.isActive) {
      return c.json({ success: false, error: 'Event is not active' }, 400);
    }

    return c.json({
      success: true,
      eventId: eventDoc.id,
      eventName: eventData.name,
    });
  } catch (error: unknown) {
    console.error('Validate guest code error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to validate code',
      },
      500
    );
  }
});

/**
 * POST /api/guests/register
 * Register a guest user (email/phone + event code + name, then create guest account)
 */
guests.post('/register', async c => {
  try {
    const requestData = (await c.req.json()) as GuestRegistrationRequest;
    const { email, phone, eventCode, name } = requestData;

    if (!eventCode) {
      return c.json({ success: false, error: 'Event code is required' }, 400);
    }

    if (!email && !phone) {
      return c.json({ success: false, error: 'Either email or phone is required' }, 400);
    }

    if (!name) {
      return c.json({ success: false, error: 'Name is required' }, 400);
    }

    const eventsRef = adminDb.collection('events');
    const eventSnapshot = await eventsRef.where('code', '==', eventCode).get();

    if (eventSnapshot.empty) {
      return c.json({ success: false, error: 'Invalid event code' }, 404);
    }

    const eventDoc = eventSnapshot.docs[0];
    const eventData = eventDoc.data();

    if (!eventData.isActive) {
      return c.json({ success: false, error: 'Event is not active' }, 400);
    }

    const identifier = email || phone;
    const identifierField = email ? 'email' : 'phone';

    const existingGuestSnapshot = await adminDb
      .collection('users')
      .where(identifierField, '==', identifier)
      .where('isGuest', '==', true)
      .get();

    let guestUserId: string;
    let isNewGuest = false;

    if (!existingGuestSnapshot.empty) {
      guestUserId = existingGuestSnapshot.docs[0].id;
    } else {
      isNewGuest = true;
      const guestDoc = await adminDb.collection('users').add({
        [identifierField]: identifier,
        name,
        isGuest: true,
        isAdmin: false,
        signedConsentForm: false,
        createdAt: new Date(),
        guestEvents: [eventDoc.id],
      });

      guestUserId = guestDoc.id;
    }

    if (!isNewGuest) {
      const guestDoc = existingGuestSnapshot.docs[0];
      const guestData = guestDoc.data();
      const guestEvents = (guestData.guestEvents as string[]) || [];

      if (!guestEvents.includes(eventDoc.id)) {
        await guestDoc.ref.update({
          guestEvents: [...guestEvents, eventDoc.id],
        });
      }
    }

    return c.json({
      success: true,
      guestId: guestUserId,
      eventId: eventDoc.id,
      requiresConsentForm: !existingGuestSnapshot.empty
        ? !existingGuestSnapshot.docs[0].data().signedConsentForm
        : true,
    });
  } catch (error: unknown) {
    console.error('Register guest error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to register guest',
      },
      500
    );
  }
});

export default guests;
