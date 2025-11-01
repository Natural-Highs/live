import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import surveyRoutes from './routes/surveys';
import { errorHandler } from './middleware/errorHandler';

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

app.get('/health', (c) => c.json({ status: 'ok' }));

// API routes
app.route('/api/auth', authRoutes);
app.route('/api/users', userRoutes);
app.route('/api/surveys', surveyRoutes);
app.route('/api/adminSurvey', surveyRoutes);
app.route('/api/surveyQuestions', surveyRoutes);
app.route('/api/userResponses', surveyRoutes);
app.route('/api/initialSurvey', surveyRoutes);

// Error handler (must be last)
app.onError(errorHandler);

// Export for Bun
const port = process.env.PORT || 3000;
export default {
  port,
  fetch: app.fetch,
};

if (typeof Bun !== 'undefined' && Bun.serve) {
  Bun.serve({
    port: Number(port) || 3000,
    fetch: app.fetch,
  });
  console.log(`🚀 Server running on http://localhost:${port}`);
}
