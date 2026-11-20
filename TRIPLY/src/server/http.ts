import { reportError, runRequest, setHttpStatus } from '@/server/sentry';

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
// Each request also runs in a trace span that continues the trace sent by the app.
export function route<A extends unknown[]>(handler: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    const request = args.find((a): a is Request => a instanceof Request);
    const run = async (): Promise<Response> => {
      try {
        return await handler(...args);
      } catch (error) {
        if (error instanceof HttpError) {
          // 4xx is the client's doing; 5xx (e.g. queue_unavailable) is ours.
          if (error.status >= 500) {
            await reportError(error, 'API server error', { code: error.code, status: error.status });
          }
          return json({ error: error.code, message: error.message, ...error.extra }, error.status);
        }
        await reportError(error, 'Unhandled API error');
        return json({ error: 'internal_error' }, 500);
      }
    };
    if (!request) return run();
    return runRequest(request, async (span) => {
      const response = await run();
      setHttpStatus(span, response.status);
      return response;
    });
  };
}
