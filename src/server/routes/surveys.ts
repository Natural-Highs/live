import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { adminAuth, adminDb } from '$lib/firebase/firebase.admin';
import { db } from '$lib/firebase/firebase';
import {
  authMiddleware,
  adminMiddleware,
  type AuthContext,
} from '../middleware/auth';
import { fetchByQuery } from '$lib/utils/firebaseCalls';

const surveys = new Hono();

// All survey routes require authentication
surveys.use('*', authMiddleware);

/**
 * GET /api/surveys
 * Get user's survey responses
 */
surveys.get('/', async (c: AuthContext) => {
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
  } catch (error: any) {
    console.error('Get surveys error:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /api/initialSurvey
 * Mark initial survey as completed
 */
surveys.post('/initialSurvey', async (c: AuthContext) => {
  try {
    const { token } = await c.req.json();
    const user = c.get('user');

    if (!user || !user.email) {
      return c.json({ success: false, message: 'User not found' }, 404);
    }

    const userRef = adminDb.collection('users');
    const querySnapshot = await userRef.where('email', '==', user.email).get();

    if (querySnapshot.empty) {
      return c.json({ success: false, message: 'User not found' }, 404);
    }

    const [userDoc] = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      uid: doc.data().uid,
      ...doc.data(),
    }));

    const userDocRef = userRef.doc(userDoc.id);

    await userDocRef.update({
      completedInitialSurvey: true,
    });

    console.log('Updating claims');
    await adminAuth.setCustomUserClaims(userDoc.uid, {
      admin: userDoc.isAdmin || false,
      initialSurvey: true,
    });

    // Note: Session cookie should be refreshed client-side after claims update
    return c.json({ success: true });
  } catch (error: any) {
    console.error('Initial survey error:', error);
    return c.json({ success: false, error: error.code || error.message }, 500);
  }
});

/**
 * GET /api/surveyQuestions?id=<surveyId>
 * Get questions for a survey
 */
surveys.get('/surveyQuestions', async (c: AuthContext) => {
  try {
    const surveyId = c.req.query('id');

    if (!surveyId) {
      return c.json({ success: false, message: 'No survey ID provided' }, 400);
    }

    const surveyRef = adminDb.collection('surveys');
    const surveyData = await surveyRef.doc(surveyId).get();

    if (!surveyData.exists) {
      return c.json({ success: false, message: 'No survey exists!' }, 404);
    }

    const { name } = surveyData.data() || {};
    const questionRef = adminDb.collection('questions');
    const questionData = await questionRef
      .where('surveyId', '==', surveyId)
      .get();

    const questions = questionData.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return c.json({ questions, name });
  } catch (error: any) {
    console.error('Get survey questions error:', error);
    return c.json({ success: false, message: 'Something went wrong' }, 500);
  }
});

/**
 * POST /api/surveyQuestions
 * Create a new question
 */
surveys.post('/surveyQuestions', adminMiddleware, async (c: AuthContext) => {
  try {
    const data = await c.req.json();
    const { newQuestion, surveyId } = data;

    if (!newQuestion || !surveyId) {
      return c.json(
        { success: false, message: 'Missing question or surveyId' },
        400
      );
    }

    const surveyRef = adminDb.collection('surveys');
    const surveyData = await surveyRef.doc(surveyId).get();

    if (!surveyData.exists) {
      return c.json({ success: false, message: 'No survey exists!' }, 404);
    }

    const questionsRef = adminDb.collection('questions');
    const addedDoc = await questionsRef.add({
      ...newQuestion,
      surveyId,
    });

    return c.json({ success: true, questionId: addedDoc.id });
  } catch (error: any) {
    console.error('Create question error:', error);
    return c.json({ success: false, message: 'An error occurred' }, 500);
  }
});

/**
 * PATCH /api/surveyQuestions
 * Update a question
 */
surveys.patch('/surveyQuestions', adminMiddleware, async (c: AuthContext) => {
  try {
    const { question } = await c.req.json();
    const { isMultipleChoice, questionText, options, questionId } = question;

    if (!questionId) {
      return c.json({ success: false, message: 'Missing questionId' }, 400);
    }

    const questionsRef = adminDb.collection('questions');
    const documentRef = questionsRef.doc(questionId);

    if (isMultipleChoice) {
      await documentRef.update({ questionText, options, isMultipleChoice });
    } else {
      await documentRef.update({ questionText, isMultipleChoice });
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Update question error:', error);
    return c.json({ success: false }, 500);
  }
});

/**
 * DELETE /api/surveyQuestions
 * Delete a question
 */
surveys.delete('/surveyQuestions', adminMiddleware, async (c: AuthContext) => {
  try {
    const { questionId } = await c.req.json();

    if (!questionId) {
      return c.json({ success: false, message: 'Missing questionId' }, 400);
    }

    const questionsRef = adminDb.collection('questions');
    const documentRef = questionsRef.doc(questionId);
    await documentRef.delete();

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Delete question error:', error);
    return c.json({ success: false }, 500);
  }
});

/**
 * GET /api/adminSurvey?id=<surveyId>
 * Get admin survey list
 */
surveys.get('/adminSurvey', adminMiddleware, async (c: AuthContext) => {
  try {
    const allDocs = await adminDb.collection('surveys').get();

    if (allDocs.empty) {
      return c.json({ surveys: [] });
    }

    const surveys = allDocs.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name,
    }));

    return c.json({ surveys });
  } catch (error: any) {
    console.error('Get admin surveys error:', error);
    return c.json({ success: false, message: error.message }, 500);
  }
});

/**
 * POST /api/adminSurvey
 * Create a new survey (admin only)
 */
surveys.post('/adminSurvey', adminMiddleware, async (c: AuthContext) => {
  try {
    const { surveyName } = await c.req.json();

    if (!surveyName) {
      return c.json({ success: false, message: 'Survey name required' }, 400);
    }

    const result = await adminDb.collection('surveys').add({
      name: surveyName,
      createdAt: new Date(),
    });

    console.log('Survey added with ID:', result.id);
    return c.json({ success: true, id: result.id });
  } catch (error: any) {
    console.error('Create survey error:', error);
    return c.json({ success: false, message: error.message }, 500);
  }
});

/**
 * PATCH /api/adminSurvey?id=<surveyId>
 * Update survey name
 */
surveys.patch('/adminSurvey', adminMiddleware, async (c: AuthContext) => {
  try {
    const surveyId = c.req.query('id');
    const { newSurveyName } = await c.req.json();

    if (!surveyId || !newSurveyName) {
      return c.json(
        { success: false, message: 'Survey ID and new name required' },
        400
      );
    }

    const surveyRef = adminDb.collection('surveys').doc(surveyId);
    await surveyRef.update({
      name: newSurveyName,
    });

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Update survey error:', error);
    return c.json({ success: false }, 500);
  }
});

/**
 * GET /api/userResponses?id=<surveyId>
 * Get user's response to a specific survey
 */
surveys.get('/userResponses', async (c: AuthContext) => {
  try {
    const surveyId = c.req.query('id');

    if (!surveyId) {
      return c.json({ success: false, message: 'No survey ID provided' }, 400);
    }

    // Verify survey exists
    const surveyDocRef = adminDb.collection('surveys');
    const surveyDoc = await surveyDocRef.doc(surveyId).get();

    if (!surveyDoc.exists) {
      return c.json({ success: false, message: 'Survey not found' }, 404);
    }

    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, message: 'User not found' }, 404);
    }

    const userData = await fetchByQuery('users', 'uid', user.uid);

    if (!userData || userData.length === 0) {
      return c.json({ success: false, message: 'User not found!' }, 404);
    }

    const userId = userData[0].id;

    const surveyResponseRef = adminDb.collection('surveyResponses');
    const surveyResponseSnapshot = await surveyResponseRef
      .where('userId', '==', userId)
      .where('surveyId', '==', surveyId)
      .get();

    if (surveyResponseSnapshot.empty) {
      return c.json({
        success: false,
        message: 'Survey response not found',
      });
    }

    const response = surveyResponseSnapshot.docs[0].data();
    const responseId = surveyResponseSnapshot.docs[0].id;

    if (!response.isComplete) {
      return c.json({
        success: true,
        response: { ...response, id: responseId },
      });
    }

    const questionResponses = await fetchByQuery(
      'responses',
      'surveyResponseId',
      responseId
    );

    const questionsData = await fetchByQuery('questions', 'surveyId', surveyId);

    const responsesWithText = questionResponses.map((resp: any) => {
      const matchingQuestion = questionsData.find(
        (q: any) => q.id === resp.questionId
      );
      return {
        ...resp,
        questionText: matchingQuestion
          ? matchingQuestion.questionText
          : 'Question not found',
        isMultipleChoice: matchingQuestion
          ? matchingQuestion.isMultipleChoice
          : false,
        options: matchingQuestion ? matchingQuestion.options : [],
      };
    });

    return c.json({
      success: true,
      response: { ...response, id: responseId },
      questionResponses: responsesWithText,
    });
  } catch (error: any) {
    console.error('Get user responses error:', error);
    return c.json({ success: false, message: error.message }, 500);
  }
});

/**
 * POST /api/userResponses
 * Submit user response to survey
 */
surveys.post('/userResponses', async (c: AuthContext) => {
  try {
    const data = await c.req.json();
    const { surveyId, responses } = data;

    if (!surveyId || !responses) {
      return c.json(
        { success: false, message: 'Survey ID and responses required' },
        400
      );
    }

    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, message: 'User not found' }, 404);
    }

    const userData = await fetchByQuery('users', 'uid', user.uid);

    if (!userData || userData.length === 0) {
      return c.json({ success: false, message: 'User not found!' }, 404);
    }

    const userId = userData[0].id;

    // Check if response already exists
    const surveyResponseRef = adminDb.collection('surveyResponses');
    const existingResponse = await surveyResponseRef
      .where('userId', '==', userId)
      .where('surveyId', '==', surveyId)
      .get();

    let surveyResponseId: string;

    if (existingResponse.empty) {
      // Create new survey response
      const newResponse = await surveyResponseRef.add({
        userId,
        surveyId,
        isComplete: false,
        createdAt: new Date(),
      });
      surveyResponseId = newResponse.id;
    } else {
      // Update existing response
      surveyResponseId = existingResponse.docs[0].id;
      await surveyResponseRef.doc(surveyResponseId).update({
        isComplete: false,
      });
    }

    // Add or update individual question responses
    for (const response of responses) {
      const { questionId, responseText, selectedOptions } = response;

      const existingResponseDoc = await adminDb
        .collection('responses')
        .where('surveyResponseId', '==', surveyResponseId)
        .where('questionId', '==', questionId)
        .get();

      const responseData: any = {
        surveyResponseId,
        questionId,
        responseText: responseText || '',
        selectedOptions: selectedOptions || [],
      };

      if (existingResponseDoc.empty) {
        await adminDb.collection('responses').add(responseData);
      } else {
        await adminDb
          .collection('responses')
          .doc(existingResponseDoc.docs[0].id)
          .update(responseData);
      }
    }

    // Mark survey response as complete
    await surveyResponseRef.doc(surveyResponseId).update({
      isComplete: true,
    });

    return c.json({ success: true, surveyResponseId });
  } catch (error: any) {
    console.error('Submit user response error:', error);
    return c.json({ success: false, message: error.message }, 500);
  }
});

export default surveys;
