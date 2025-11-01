import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';

export async function errorHandler(err: Error, c: Context) {
  console.error('Error:', err);

  if (err instanceof HTTPException) {
    return err.getResponse();
  }

  if ((err as { name?: string }).name === 'FirebaseError') {
    return c.json(
      {
        error: 'Firebase error',
        message: err.message,
      },
      500
    );
  }

  return c.json(
    {
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    },
    500
  );
}
