import type { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { adminAuth } from '$lib/firebase/firebase.admin';

export interface AuthContext extends Context {
  user?: {
    uid: string;
    email?: string;
    admin: boolean;
    signedConsentForm: boolean;
  };
}

/**
 * Verify Firebase auth token from session cookie
 */
export async function authMiddleware(c: AuthContext, next: Next) {
  const sessionToken = getCookie(c, 'session');

  if (!sessionToken) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(sessionToken);
    c.set('user', {
      uid: decodedToken.uid,
      email: decodedToken.email,
      admin: decodedToken.admin || false,
      signedConsentForm: decodedToken.signedConsentForm || false,
    });
    await next();
  } catch (error: unknown) {
    console.error('Auth middleware error:', error);

    // Clear invalid token
    if (
      (error as { code?: string }).code === 'auth/id-token-expired' ||
      (error as { code?: string }).code === 'auth/argument-error'
    ) {
      return c.json({ error: 'Token expired or invalid' }, 401);
    }

    return c.json({ error: 'Unauthorized' }, 401);
  }
}

/**
 * Require admin role
 */
export async function adminMiddleware(c: AuthContext, next: Next) {
  const user = c.get('user');

  if (!user || !user.admin) {
    return c.json({ error: 'Forbidden - Admin access required' }, 403);
  }

  await next();
}
