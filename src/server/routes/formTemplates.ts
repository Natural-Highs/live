import { Hono } from 'hono';
import { adminDb } from '$lib/firebase/firebase.admin';
import { type AuthContext, adminMiddleware, authMiddleware } from '../middleware/auth';
import type {
  FormTemplateCreationRequest,
  FormTemplateTypeValue,
  FormTemplateUpdateRequest,
} from '../types/formTemplates';
import type { FormTemplateUpdateData } from '../types/updateData';

const formTemplates = new Hono();

formTemplates.use('*', authMiddleware);
formTemplates.use('*', adminMiddleware);

/**
 * GET /api/formTemplates?type=<consent|demographics|survey>
 * List form templates, optionally filtered by type
 */
formTemplates.get('/', async (c: AuthContext) => {
  try {
    const type = c.req.query('type') as FormTemplateTypeValue | undefined;

    let templatesQuery: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> =
      adminDb.collection('formTemplates');

    if (type) {
      templatesQuery = templatesQuery.where('type', '==', type);
    }

    const templatesSnapshot = await templatesQuery.get();

    const templates = templatesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return c.json({ success: true, templates });
  } catch (error: unknown) {
    console.error('Get form templates error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get form templates',
      },
      500
    );
  }
});

/**
 * GET /api/formTemplates/:id
 * Get a specific form template
 */
formTemplates.get('/:id', async (c: AuthContext) => {
  try {
    const templateId = c.req.param('id');

    const templateRef = adminDb.collection('formTemplates').doc(templateId);
    const templateDoc = await templateRef.get();

    if (!templateDoc.exists) {
      return c.json({ success: false, error: 'Template not found' }, 404);
    }

    return c.json({
      success: true,
      template: {
        id: templateDoc.id,
        ...templateDoc.data(),
      },
    });
  } catch (error: unknown) {
    console.error('Get form template error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get form template',
      },
      500
    );
  }
});

/**
 * POST /api/formTemplates
 * Create a new form template (admin only)
 */
formTemplates.post('/', async (c: AuthContext) => {
  try {
    const requestData = (await c.req.json()) as FormTemplateCreationRequest;
    const { type, name, questions } = requestData;

    if (!type || !name) {
      return c.json({ success: false, error: 'Type and name are required' }, 400);
    }

    if (!['consent', 'demographics', 'survey'].includes(type)) {
      return c.json(
        {
          success: false,
          error: 'Type must be consent, demographics, or survey',
        },
        400
      );
    }

    const templateData = {
      type,
      name,
      questions: questions || [],
      createdAt: new Date(),
      createdBy: c.get('user')?.uid,
      version: 1,
    };

    const templateRef = await adminDb.collection('formTemplates').add(templateData);

    return c.json({
      success: true,
      templateId: templateRef.id,
      template: { ...templateData, id: templateRef.id },
    });
  } catch (error: unknown) {
    console.error('Create form template error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create form template',
      },
      500
    );
  }
});

/**
 * PATCH /api/formTemplates/:id
 * Update a form template (admin only)
 */
formTemplates.patch('/:id', async (c: AuthContext) => {
  try {
    const templateId = c.req.param('id');
    const requestData = (await c.req.json()) as FormTemplateUpdateRequest;
    const { name, questions } = requestData;

    const templateRef = adminDb.collection('formTemplates').doc(templateId);
    const templateDoc = await templateRef.get();

    if (!templateDoc.exists) {
      return c.json({ success: false, error: 'Template not found' }, 404);
    }

    const updateData: FormTemplateUpdateData = {
      updatedAt: new Date(),
      updatedBy: c.get('user')?.uid,
    };

    if (name !== undefined) updateData.name = name;
    if (questions !== undefined) {
      updateData.questions = questions;
      const currentVersion = (templateDoc.data()?.version as number) || 1;
      updateData.version = currentVersion + 1;
    }

    await templateRef.update(updateData as unknown as Record<string, unknown>);

    return c.json({ success: true });
  } catch (error: unknown) {
    console.error('Update form template error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update form template',
      },
      500
    );
  }
});

/**
 * DELETE /api/formTemplates/:id
 * Delete a form template (admin only)
 */
formTemplates.delete('/:id', async (c: AuthContext) => {
  try {
    const templateId = c.req.param('id');

    const templateRef = adminDb.collection('formTemplates').doc(templateId);
    const templateDoc = await templateRef.get();

    if (!templateDoc.exists) {
      return c.json({ success: false, error: 'Template not found' }, 404);
    }

    await templateRef.delete();

    return c.json({ success: true });
  } catch (error: unknown) {
    console.error('Delete form template error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete form template',
      },
      500
    );
  }
});

export default formTemplates;
