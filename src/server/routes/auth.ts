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
 * POST /api/auth/register
 * Register a new user with username, email, and password
 * Issue #63: Implement Sign Up (Page 1) Functionality
 */
auth.post('/register', async (c) => {
  try {
    const { username, email, password, confirmPassword } = await c.req.json();

    // Validation
    if (!username || !email || !password || !confirmPassword) {
      return c.json(
        { success: false, error: 'All fields are required' },
        400
      );
    }

    if (password !== confirmPassword) {
      return c.json(
        { success: false, error: 'Passwords do not match' },
        400
      );
    }

    // Check if username already exists
    const usernameCheck = await adminDb
      .collection('users')
      .where('username', '==', username)
      .get();

    if (!usernameCheck.empty) {
      return c.json(
        { success: false, error: 'Username already exists' },
        409
      );
    }

    // Check if email already exists
    try {
      await adminAuth.getUserByEmail(email);
      return c.json({ success: false, error: 'Email already exists' }, 409);
    } catch (error: unknown) {
      // User doesn't exist, continue with registration
    }

    // Create Firebase Auth user
    const userRecord = await adminAuth.createUser({
      email: email,
      password: password,
    });

    // Create user document in Firestore
    await adminDb.collection('users').doc(userRecord.uid).set({
      username: username,
      email: email,
      createdAt: new Date(),
      uid: userRecord.uid,
      isAdmin: false,
      completedInitialSurvey: false,
    });

    return c.json({
      success: true,
      message: 'User created successfully',
      uid: userRecord.uid,
    });
  } catch (error: unknown) {
    console.error('Registration error:', error);
    return c.json(
      {
        success: false,
        error:
          (error instanceof Error && error.message) ||
          'Failed to create user',
      },
      500
    );
  }
});

/**
 * POST /api/auth/login
 * Login user with email and password
 * Issue #62: Implement Log In Functionality
 * Note: Firebase Admin SDK doesn't verify passwords directly.
 * Client should use Firebase Auth SDK for password verification,
 * then send the resulting idToken to /api/auth/sessionLogin
 */
auth.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json(
        { success: false, error: 'Email and password are required' },
        400
      );
    }

    // Get user by email to verify account exists
    // Actual password verification happens client-side with Firebase Auth SDK
    try {
      const userRecord = await adminAuth.getUserByEmail(email);
      
      // Get user document from Firestore
      const userRef = adminDb.collection('users');
      const querySnapshot = await userRef.where('email', '==', email).get();

      if (querySnapshot.empty) {
        return c.json(
          { success: false, error: 'User not found in database' },
          404
        );
      }

      // Return success - client will verify password with Firebase Auth SDK
      return c.json({
        success: true,
        message: 'Email verified - use Firebase Auth client SDK for password verification',
        userId: userRecord.uid,
      });
    } catch (error: unknown) {
      // User not found
      return c.json(
        { success: false, error: 'Invalid email or password' },
        401
      );
    }
  } catch (error: unknown) {
    console.error('Login error:', error);
    return c.json(
      {
        success: false,
        error:
          (error instanceof Error && error.message) || 'Login failed',
      },
      500
    );
  }
});

export default auth;
