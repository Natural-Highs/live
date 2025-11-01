import { Hono } from 'hono';
import { db } from '$lib/firebase/firebase';
import { adminAuth } from '$lib/firebase/firebase.admin';
import { type AuthContext, adminMiddleware, authMiddleware } from '../middleware/auth';
import type { UserProfileUpdateData } from '../types/updateData';
import type {
  EventCodeSubmissionRequest,
  UserProfileUpdateRequest,
  UserWithCustomClaims,
} from '../types/users';

const users = new Hono();

/**
 * GET /api/users?user=<email>
 * Get user by email (admin only)
 */
users.get('/', authMiddleware, adminMiddleware, async (c: AuthContext) => {
  try {
    const userEmail = c.req.query('user');

    if (!userEmail) {
      return c.json({ success: false, message: 'User email required' }, 400);
    }

    const userRef = db.collection('users');
    const querySnapshot = await userRef.where('email', '==', userEmail).get();

    if (querySnapshot.empty) {
      return c.json({ success: false, message: 'User not found' }, 404);
    }

    const [user] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Set custom claims
    try {
      const authUser = await adminAuth.getUserByEmail(userEmail);
      const userData = user as unknown as UserWithCustomClaims;
      await adminAuth.setCustomUserClaims(authUser.uid, {
        admin: userData.isAdmin || false,
        signedConsentForm: userData.signedConsentForm || false,
      });
      console.log('Custom claims set!');
    } catch (error) {
      console.error('Error setting custom claims:', error);
      return c.json({ success: false, message: 'Failed to set claims' }, 500);
    }

    return c.json({ success: true, data: user });
  } catch (error: unknown) {
    console.error('Get user error:', error);
    return c.json(
      {
        success: false,
        message: (error instanceof Error && error.message) || 'Failed to get user',
      },
      500
    );
  }
});

/**
 * GET /api/users/profile
 * Get current authenticated user's profile
 */
users.get('/profile', authMiddleware, async (c: AuthContext) => {
  try {
    const user = c.get('user');
    if (!user || !user.email) {
      return c.json({ error: 'User not found' }, 404);
    }

    const userRef = db.collection('users');
    const querySnapshot = await userRef.where('email', '==', user.email).get();

    if (querySnapshot.empty) {
      return c.json({ error: 'User not found' }, 404);
    }

    const [userDoc] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return c.json({ success: true, data: userDoc });
  } catch (error: unknown) {
    console.error('Get user profile error:', error);
    return c.json(
      {
        error: (error instanceof Error && error.message) || 'Failed to get user profile',
      },
      500
    );
  }
});

/**
 * POST /api/users/profile
 * Update current authenticated user's profile
 */
users.post('/profile', authMiddleware, async (c: AuthContext) => {
  try {
    const user = c.get('user');
    if (!user || !user.email) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    const requestData = (await c.req.json()) as UserProfileUpdateRequest;
    const {
      firstName,
      lastName,
      phone,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelationship,
      dateOfBirth,
    } = requestData;

    const userRef = db.collection('users');
    const querySnapshot = await userRef.where('email', '==', user.email).get();

    if (querySnapshot.empty) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    const userDoc = querySnapshot.docs[0];
    const updateData: Partial<UserProfileUpdateData> = {};

    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;

    if (emergencyContactName !== undefined) updateData.emergencyContactName = emergencyContactName;
    if (emergencyContactPhone !== undefined)
      updateData.emergencyContactPhone = emergencyContactPhone;
    if (emergencyContactRelationship !== undefined)
      updateData.emergencyContactRelationship = emergencyContactRelationship;

    updateData.profileCompleted = true;
    updateData.profileUpdatedAt = new Date();

    await userRef.doc(userDoc.id).update(updateData);

    return c.json({
      success: true,
      message: 'Profile updated successfully',
    });
  } catch (error: unknown) {
    console.error('Update user profile error:', error);
    return c.json(
      {
        success: false,
        error: (error instanceof Error && error.message) || 'Failed to update profile',
      },
      500
    );
  }
});

/**
 * POST /api/users/eventCode
 * User enters event code on profile page
 */
users.post('/eventCode', authMiddleware, async (c: AuthContext) => {
  try {
    const user = c.get('user');
    if (!user || !user.email) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    const { eventCode } = (await c.req.json()) as EventCodeSubmissionRequest;

    if (!eventCode) {
      return c.json({ success: false, error: 'Event code is required' }, 400);
    }

    const userRef = db.collection('users');
    const querySnapshot = await userRef.where('email', '==', user.email).get();

    if (querySnapshot.empty) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    const eventsRef = db.collection('events');
    const eventSnapshot = await eventsRef.where('code', '==', eventCode).get();

    if (eventSnapshot.empty) {
      return c.json({ success: false, error: 'Invalid event code' }, 404);
    }

    const eventDoc = eventSnapshot.docs[0];
    const eventData = eventDoc.data();

    if (!eventData.isActive) {
      return c.json({ success: false, error: 'Event is not active' }, 400);
    }

    const userDoc = querySnapshot.docs[0];
    const userId = userDoc.id;

    const userEventsRef = db.collection('userEvents');
    const existingEventRef = await userEventsRef
      .where('userId', '==', userId)
      .where('eventId', '==', eventDoc.id)
      .get();

    if (!existingEventRef.empty) {
      return c.json({ success: false, error: 'Already registered for this event' }, 400);
    }

    await userEventsRef.add({
      userId,
      eventId: eventDoc.id,
      eventCode,
      registeredAt: new Date(),
    });

    return c.json({
      success: true,
      message: 'Successfully registered for event',
      eventId: eventDoc.id,
      eventName: eventData.name,
    });
  } catch (error: unknown) {
    console.error('Enter event code error:', error);
    return c.json(
      {
        success: false,
        error: (error instanceof Error && error.message) || 'Failed to register for event',
      },
      500
    );
  }
});

/**
 * GET /api/users/me
 * Get current authenticated user's survey responses
 */
users.get('/me', authMiddleware, async (c: AuthContext) => {
  try {
    const user = c.get('user');
    if (!user || !user.email) {
      return c.json({ error: 'User not found' }, 404);
    }

    const userRef = db.collection('users');
    const querySnapshot = await userRef.where('email', '==', user.email).get();

    if (querySnapshot.empty) {
      return c.json({ error: 'User not found' }, 404);
    }

    const [userDoc] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    const userId = userDoc.id;

    const surveyResponseRef = db.collection('surveyResponses');
    const responseSnapshot = await surveyResponseRef.where('userId', '==', userId).get();

    const surveyResponses = responseSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return c.json(surveyResponses);
  } catch (error: unknown) {
    console.error('Get user responses error:', error);
    return c.json(
      {
        error: (error instanceof Error && error.message) || 'Failed to get user responses',
      },
      500
    );
  }
});

export default users;
