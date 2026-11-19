export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message?: string,
    public extra?: Record<string, unknown>,
  ) {
    super(message ?? code);
  }
}

export function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

// Wraps a route handler so thrown HttpErrors become JSON responses and anything else is a 500.
export function route<A extends unknown[]>(handler: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof HttpError) {
        return json({ error: error.code, message: error.message, ...error.extra }, error.status);
      }
      console.error('Unhandled API error', error);
      return json({ error: 'internal_error' }, 500);
    }
  };
}
