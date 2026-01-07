/**
 * MSW Default Handlers
 *
 * Routes now call TanStack Start server functions directly.
 * No REST API endpoints exist - handlers are empty.
 *
 * The factories in ./factories/ are still available for
 * mocking server function responses in tests.
 */

import type {RequestHandler} from 'msw'

export const handlers: RequestHandler[] = []
