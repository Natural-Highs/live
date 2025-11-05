import { Hono } from 'hono';
import { db } from '$lib/firebase/firebase';
import { adminDb } from '$lib/firebase/firebase.admin';
import { fetchByQuery } from '$lib/utils/firebaseCalls';
import { type AuthContext, adminMiddleware, authMiddleware } from '../middleware/auth';
import type { QuestionResponseWithText, SurveyQuestion } from '../types/surveyData';
import type {
  SurveyCreationRequest,
  SurveyQuestionCreationRequest,
  SurveyQuestionDeleteRequest,
  SurveyQuestionUpdateRequest,
  SurveyUpdateRequest,
} from '../types/surveys';

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
    console.error('Get surveys error:', error);
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get surveys',
      },
      500
    );
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
    const questionData = await questionRef.where('surveyId', '==', surveyId).get();

    const questions = questionData.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return c.json({ questions, name });
  } catch (error: unknown) {
    console.error('Get survey questions error:', error);
    return c.json(
      {
        message: error instanceof Error ? error.message : 'Failed to get survey questions',
      },
      500
    );
  }
});

/**
 * POST /api/surveyQuestions
 * Create a new question
 */
surveys.post('/surveyQuestions', authMiddleware, adminMiddleware, async (c: AuthContext) => {
  try {
    const requestData = (await c.req.json()) as SurveyQuestionCreationRequest;
    const { newQuestion, surveyId } = requestData;

    if (!newQuestion || !surveyId) {
      return c.json({ success: false, message: 'Missing question or surveyId' }, 400);
    }

    const surveyRef = adminDb.collection('surveys');
    const surveyData = await surveyRef.doc(surveyId).get();

    if (!surveyData.exists) {
      return c.json({ success: false, message: 'No survey exists!' }, 404);
    }

    const questionsRef = adminDb.collection('questions');
    const questionData: Record<string, unknown> = {
      questionText: newQuestion,
      surveyId,
    };
    const addedDoc = await questionsRef.add(questionData);

    return c.json({ success: true, questionId: addedDoc.id });
  } catch (error: unknown) {
    console.error('Create question error:', error);
    return c.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create question',
      },
      500
    );
  }
});

/**
 * PATCH /api/surveyQuestions
 * Update a question (text input only)
 */
surveys.patch('/surveyQuestions', authMiddleware, adminMiddleware, async (c: AuthContext) => {
  try {
    const requestData = (await c.req.json()) as SurveyQuestionUpdateRequest;
    const { question } = requestData;
    const { questionText, questionId } = question;

    if (!questionId) {
      return c.json({ success: false, message: 'Missing questionId' }, 400);
    }

    if (!questionText) {
      return c.json({ success: false, message: 'Question text is required' }, 400);
    }

    const questionsRef = adminDb.collection('questions');
    const documentRef = questionsRef.doc(questionId);

    await documentRef.update({ questionText });

    return c.json({ success: true });
  } catch (error: unknown) {
    console.error('Update question error:', error);
    return c.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update question',
      },
      500
    );
  }
});

/**
 * DELETE /api/surveyQuestions
 * Delete a question
 */
surveys.delete('/surveyQuestions', authMiddleware, adminMiddleware, async (c: AuthContext) => {
  try {
    const requestData = (await c.req.json()) as SurveyQuestionDeleteRequest;
    const { questionId } = requestData;

    if (!questionId) {
      return c.json({ success: false, message: 'Missing questionId' }, 400);
    }

    const questionsRef = adminDb.collection('questions');
    const documentRef = questionsRef.doc(questionId);
    await documentRef.delete();

    return c.json({ success: true });
  } catch (error: unknown) {
    console.error('Delete question error:', error);
    return c.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete question',
      },
      500
    );
  }
});

/**
 * GET /api/adminSurvey?id=<surveyId>
 * Get admin survey list
 */
surveys.get('/adminSurvey', authMiddleware, adminMiddleware, async (c: AuthContext) => {
  try {
    const allDocs = await adminDb.collection('surveys').get();

    if (allDocs.empty) {
      return c.json({ surveys: [] });
    }

    const surveys = allDocs.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
    }));

    return c.json({ surveys });
  } catch (error: unknown) {
    console.error('Get admin surveys error:', error);
    return c.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get admin surveys',
      },
      500
    );
  }
});

/**
 * POST /api/adminSurvey
 * Create a new survey (admin only)
 */
surveys.post('/adminSurvey', authMiddleware, adminMiddleware, async (c: AuthContext) => {
  try {
    const requestData = (await c.req.json()) as SurveyCreationRequest;
    const { surveyName } = requestData;

    if (!surveyName) {
      return c.json({ success: false, message: 'Survey name required' }, 400);
    }

    const result = await adminDb.collection('surveys').add({
      name: surveyName,
      createdAt: new Date(),
    });

    console.log('Survey added with ID:', result.id);
    return c.json({ success: true, id: result.id });
  } catch (error: unknown) {
    console.error('Create survey error:', error);
    return c.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create survey',
      },
      500
    );
  }
});

/**
 * PATCH /api/adminSurvey?id=<surveyId>
 * Update survey name
 */
surveys.patch('/adminSurvey', authMiddleware, adminMiddleware, async (c: AuthContext) => {
  try {
    const surveyId = c.req.query('id');
    const requestData = (await c.req.json()) as SurveyUpdateRequest;
    const { newSurveyName } = requestData;

    if (!surveyId || !newSurveyName) {
      return c.json({ success: false, message: 'Survey ID and new name required' }, 400);
    }

    const surveyRef = adminDb.collection('surveys').doc(surveyId);
    await surveyRef.update({
      name: newSurveyName,
    });

    return c.json({ success: true });
  } catch (error: unknown) {
    console.error('Update survey error:', error);
    return c.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update survey',
      },
      500
    );
  }
});

/**
 * GET /api/userResponses?id=<surveyId>
 * Get user's response to a specific survey (text input only)
 */
surveys.get('/userResponses', async (c: AuthContext) => {
  try {
    const surveyId = c.req.query('id');

    if (!surveyId) {
      return c.json({ success: false, message: 'No survey ID provided' }, 400);
    }

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

    const questionResponses = await fetchByQuery('responses', 'surveyResponseId', responseId);

    const questionsData = (await fetchByQuery(
      'questions',
      'surveyId',
      surveyId
    )) as SurveyQuestion[];
    const responsesWithText: QuestionResponseWithText[] = (
      questionResponses as unknown as Array<{
        questionId: string;
        responseText: string;
      }>
    ).map(resp => {
      const matchingQuestion = questionsData.find(q => q.id === resp.questionId);
      return {
        ...resp,
        questionText: matchingQuestion ? matchingQuestion.questionText : 'Question not found',
      } as QuestionResponseWithText;
    });

    return c.json({
      success: true,
      response: { ...response, id: responseId },
      questionResponses: responsesWithText,
    });
  } catch (error: unknown) {
    console.error('Get user responses error:', error);
    return c.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get user responses',
      },
      500
    );
  }
});

/**
 * POST /api/userResponses
 * Submit user response to survey (text input only)
 */
surveys.post('/userResponses', async (c: AuthContext) => {
  try {
    const requestData = (await c.req.json()) as {
      surveyId: string;
      responses: Array<{ questionId: string; responseText: string }>;
    };
    const { surveyId, responses } = requestData;

    if (!surveyId || !responses) {
      return c.json({ success: false, message: 'Survey ID and responses required' }, 400);
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

    // Add or update individual question responses (text input only)
    for (const response of responses) {
      const { questionId, responseText } = response;

      if (!questionId || !responseText) {
        continue;
      }

      const existingResponseDoc = await adminDb
        .collection('responses')
        .where('surveyResponseId', '==', surveyResponseId)
        .where('questionId', '==', questionId)
        .get();

      const responseData = {
        surveyResponseId,
        questionId,
        responseText: responseText || '',
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
  } catch (error: unknown) {
    console.error('Submit user response error:', error);
    return c.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to submit survey response',
      },
      500
    );
  }
});

export default surveys;
