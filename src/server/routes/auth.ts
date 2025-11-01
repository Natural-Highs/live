import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { adminAuth, adminDb } from '$lib/firebase/firebase.admin';

const auth = new Hono();

/**
 * POST /api/auth/sessionLogin
 * Creates or updates session from Firebase ID token
 */
auth.post('/sessionLogin', async (c) => {
  try {
    const oldToken = getCookie(c, 'session');
    if (oldToken) {
      return c.json({ success: true });
    }

    const { idToken } = await c.req.json();
    if (!idToken) {
      return c.json({ success: false, error: 'Missing idToken' }, 400);
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken.toString());
    const uid = decodedToken.uid;
    const email = decodedToken.email;

    // Get user from Firestore
    const userRef = adminDb.collection('users');
    const querySnapshot = await userRef.where('email', '==', email).get();

    if (querySnapshot.empty) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    const [user] = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Set custom claims
    await adminAuth.setCustomUserClaims(uid, {
      admin: (user as { isAdmin?: boolean }).isAdmin || false,
      initialSurvey:
        (user as { completedInitialSurvey?: boolean }).completedInitialSurvey ||
        false,
    });

    // Set session cookie
    const expiresIn = 60 * 60 * 24 * 5; // 5 days in seconds
    setCookie(c, 'session', idToken, {
      maxAge: expiresIn,
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      path: '/',
    });

    return c.json({
      success: true,
      redirect: true,
    });
  } catch (error: unknown) {
    console.error('Session login error:', error);
    return c.json(
      {
        success: false,
        error:
          (error instanceof Error && error.message) ||
          'Failed to create session',
      },
      500
    );
  }
});

/**
 * GET /api/auth/sessionLogin
 * Check if session exists
 */
auth.get('/sessionLogin', async (c) => {
  const oldToken = getCookie(c, 'session');
  return c.json({ token: !!oldToken });
});

/**
 * POST /api/auth/logout
 * Destroy session cookie
 */
auth.post('/logout', async (c) => {
  deleteCookie(c, 'session', { path: '/' });
  console.log('Cookie deleted');
  return c.json({ success: true });
});

/**
 * POST /api/auth/login
 * Legacy endpoint - may be used for future password-based login
 */
auth.post('/login', async (c) => {
  // This endpoint can be implemented later if needed
  // For now, authentication is handled via Firebase client SDK
  return c.json({ error: 'Use Firebase Auth client SDK for login' }, 400);
});

export default auth;
