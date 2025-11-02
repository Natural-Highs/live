import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import eventRoutes from './routes/events';
import eventTypeRoutes from './routes/eventTypes';
import formRoutes from './routes/forms';
import formTemplateRoutes from './routes/formTemplates';
import guestRoutes from './routes/guests';
import surveyRoutes from './routes/surveys';
import userRoutes from './routes/users';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: ['http://localhost:5174', 'http://localhost:3000'],
    credentials: true,
  })
);

app.get('/health', c => c.json({ status: 'ok' }));

// API routes
app.route('/api/auth', authRoutes);
app.route('/api/users', userRoutes);
app.route('/api/events', eventRoutes);
app.route('/api/eventTypes', eventTypeRoutes);
app.route('/api/formTemplates', formTemplateRoutes);
app.route('/api/forms', formRoutes);
app.route('/api/guests', guestRoutes);
app.route('/api/surveys', surveyRoutes);
app.route('/api/adminSurvey', surveyRoutes);
app.route('/api/surveyQuestions', surveyRoutes);
app.route('/api/userResponses', surveyRoutes);

app.onError(errorHandler);

const port = Number(process.env.PORT || process.env.BUN_PORT || process.env.NODE_PORT || 3000);

const server = Bun.serve({
  port,
  fetch: app.fetch,
  hostname: '0.0.0.0',
});

console.log(`Server running on ${server.url}`);
