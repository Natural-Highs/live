import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { adminAuth, adminDb } from '$lib/firebase/firebase.admin';
import { type AuthContext, authMiddleware } from '../middleware/auth';
import type {
  ConsentFormSubmissionRequest,
  DemographicsFormSubmissionRequest,
  GuestUserDocument,
  UserDocument,
} from '../types/forms';

const forms = new Hono();

/**
 * POST /api/forms/consent
 * Submit consent form (for both authenticated users and guests)
 */
forms.post('/consent', async c => {
  try {
    const requestData = (await c.req.json()) as ConsentFormSubmissionRequest;
    const { guestId } = requestData;

    let userId: string | undefined;
    let uid: string | undefined;
    let isGuest = false;

    if (guestId) {
      isGuest = true;
      const guestDoc = await adminDb.collection('users').doc(guestId).get();
      if (!guestDoc.exists) {
        return c.json({ success: false, error: 'Guest not found' }, 404);
      }
      const guestData = guestDoc.data() as GuestUserDocument | undefined;
      if (!guestData || !guestData.isGuest) {
        return c.json({ success: false, error: 'Invalid guest ID' }, 400);
      }
      userId = guestDoc.id;
      uid = guestData.uid;
    } else {
      const sessionToken = getCookie(c, 'session');
      if (!sessionToken) {
        return c.json({ success: false, error: 'Authentication required' }, 401);
      }

      try {
        const decodedToken = await adminAuth.verifyIdToken(sessionToken);
        const userRef = adminDb.collection('users');
        const querySnapshot = await userRef.where('email', '==', decodedToken.email).get();

        if (querySnapshot.empty) {
          return c.json({ success: false, error: 'User not found' }, 404);
        }

        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data() as UserDocument | undefined;

        if (!userData) {
          return c.json({ success: false, error: 'User data not found' }, 404);
        }

        userId = userDoc.id;
        uid = userData.uid;
      } catch {
        return c.json({ success: false, error: 'Invalid session' }, 401);
      }
    }

    const userDocRef = adminDb.collection('users').doc(userId!);
    const consentCompletedAt = new Date();

    await userDocRef.update({
      signedConsentForm: true,
      consentFormCompletedAt: consentCompletedAt,
    });

    if (uid) {
      const userData = (await userDocRef.get()).data();
      await adminAuth.setCustomUserClaims(uid, {
        admin: userData?.isAdmin || false,
        signedConsentForm: true,
      });
    }

    return c.json({
      success: true,
      consentCompletedAt,
      isGuest,
    });
  } catch (error: unknown) {
    console.error('Submit consent form error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit consent form',
      },
      500
    );
  }
});

/**
 * GET /api/forms/consent
 * Get consent form template (static, same for everyone)
 * Public endpoint - can be accessed by authenticated users or guests
 */
forms.get('/consent', async c => {
  try {
    const consentTemplateSnapshot = await adminDb
      .collection('formTemplates')
      .where('type', '==', 'consent')
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (consentTemplateSnapshot.empty) {
      return c.json({ success: false, error: 'Consent form template not found' }, 404);
    }

    const template = consentTemplateSnapshot.docs[0];

    return c.json({
      success: true,
      template: {
        id: template.id,
        ...template.data(),
      },
    });
  } catch (error: unknown) {
    console.error('Get consent form error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get consent form',
      },
      500
    );
  }
});

/**
 * GET /api/forms/demographics
 * Get demographics form template (content varies based on user's date of birth)
 */
forms.get('/demographics', authMiddleware, async (c: AuthContext) => {
  try {
    const user = c.get('user');
    if (!user || !user.email) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    const userRef = adminDb.collection('users');
    const userSnapshot = await userRef.where('email', '==', user.email).get();

    if (userSnapshot.empty) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    const userData = userSnapshot.docs[0].data();
    const dateOfBirth = userData.dateOfBirth;

    if (!dateOfBirth) {
      return c.json(
        {
          success: false,
          error: 'Date of birth required to determine demographics form',
        },
        400
      );
    }

    const dob = dateOfBirth.toDate ? dateOfBirth.toDate() : new Date(dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    const adjustedAge =
      monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate()) ? age - 1 : age;

    let ageCategory: string;
    if (adjustedAge < 18) {
      ageCategory = 'under18';
    } else if (adjustedAge < 65) {
      ageCategory = 'adult';
    } else {
      ageCategory = 'senior';
    }

    const demographicsTemplateSnapshot = await adminDb
      .collection('formTemplates')
      .where('type', '==', 'demographics')
      .where('ageCategory', '==', ageCategory)
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (demographicsTemplateSnapshot.empty) {
      return c.json(
        {
          success: false,
          error: 'Demographics form template not found for age category',
        },
        404
      );
    }

    const template = demographicsTemplateSnapshot.docs[0];

    return c.json({
      success: true,
      template: {
        id: template.id,
        ...template.data(),
      },
      ageCategory,
    });
  } catch (error: unknown) {
    console.error('Get demographics form error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get demographics form',
      },
      500
    );
  }
});

/**
 * POST /api/forms/demographics
 * Submit demographics form
 */
forms.post('/demographics', authMiddleware, async (c: AuthContext) => {
  try {
    const user = c.get('user');
    if (!user || !user.email) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    const requestData = (await c.req.json()) as DemographicsFormSubmissionRequest;
    const { responses } = requestData;

    if (!responses || !Array.isArray(responses)) {
      return c.json({ success: false, error: 'Responses array is required' }, 400);
    }

    const userRef = adminDb.collection('users');
    const userSnapshot = await userRef.where('email', '==', user.email).get();

    if (userSnapshot.empty) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    const userDoc = userSnapshot.docs[0];
    const completedAt = new Date();

    await userDoc.ref.update({
      demographicsFormCompleted: true,
      demographicsFormCompletedAt: completedAt,
      demographicsResponses: responses,
    });

    return c.json({
      success: true,
      demographicsFormCompletedAt: completedAt,
    });
  } catch (error: unknown) {
    console.error('Submit demographics form error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit demographics form',
      },
      500
    );
  }
});

export default forms;
