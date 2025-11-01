import { Hono } from 'hono';
import { adminAuth } from '$lib/firebase/firebase.admin';
import { db } from '$lib/firebase/firebase';
import { authMiddleware, type AuthContext } from '../middleware/auth';
import { adminMiddleware } from '../middleware/auth';

const users = new Hono();

/**
 * GET /api/users?user=<email>
 * Get user by email (admin only)
 */
users.get('/', adminMiddleware, async (c: AuthContext) => {
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

    const [user] = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Set custom claims
    try {
      const authUser = await adminAuth.getUserByEmail(userEmail);
      const userData = user as {
        isAdmin?: boolean;
        completedInitialSurvey?: boolean;
      };
      await adminAuth.setCustomUserClaims(authUser.uid, {
        admin: userData.isAdmin || false,
        initialSurvey: userData.completedInitialSurvey || false,
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
        message:
          (error instanceof Error && error.message) || 'Failed to get user',
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

    const [userDoc] = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const userId = userDoc.id;

    const surveyResponseRef = db.collection('surveyResponses');
    const responseSnapshot = await surveyResponseRef
      .where('userId', '==', userId)
      .get();

    const surveyResponses = responseSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return c.json(surveyResponses);
  } catch (error: unknown) {
    console.error('Get user responses error:', error);
    return c.json(
      {
        error:
          (error instanceof Error && error.message) ||
          'Failed to get user responses',
      },
      500
    );
  }
});

export default users;
