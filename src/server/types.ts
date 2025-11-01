// Type definitions for Hono server

declare global {
  interface Bun {
    serve(options: {
      port?: number;
      fetch: (request: Request) => Response | Promise<Response>;
    }): void;
  }
}

export {};
