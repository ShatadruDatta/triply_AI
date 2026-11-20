import * as Sentry from '@sentry/node';

// Server-side Sentry (API routes + Inngest functions). Without a DSN every call below
// still logs to the console and is otherwise a no-op, so local dev needs no setup.
const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

if (dsn && !Sentry.isInitialized()) {
  Sentry.init({
    dsn,
    enableLogs: true,
    // Sample everything while developing; in production keep a fraction to control volume.
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    environment: process.env.NODE_ENV ?? 'development',
    sendDefaultPii: false,
  });
  // Scope attributes land on every log, so server logs are easy to tell from the app's.
  Sentry.getGlobalScope().setAttributes({ service: 'api' });
}

// Only strings, numbers and booleans become searchable attributes in Sentry.
// Never put tokens, API keys or personal data in here.
type Attrs = Record<string, string | number | boolean>;

export const log = {
  info(message: string, attrs?: Attrs) {
    console.info(message, attrs ?? '');
    Sentry.logger.info(message, attrs);
  },
  warn(message: string, attrs?: Attrs) {
    console.warn(message, attrs ?? '');
    Sentry.logger.warn(message, attrs);
  },
  error(message: string, attrs?: Attrs) {
    console.error(message, attrs ?? '');
    Sentry.logger.error(message, attrs);
  },
};

// Sends the exception to Sentry (issues) plus a log line with the same context, then flushes
// so the event isn't lost if the process is about to end.
export async function reportError(error: unknown, message: string, attrs?: Attrs) {
  const detail = error instanceof Error ? error.message : String(error);
  console.error(message, detail);
  Sentry.captureException(error, { extra: attrs });
  Sentry.logger.error(message, { ...attrs, error: detail });
  await Sentry.flush(2000);
}

// --- Tracing -----------------------------------------------------------------------------
// Distributed tracing links one user action across the app, the API and the Inngest job.
// The app's fetch adds `sentry-trace` + `baggage` headers; the API route continues that trace,
// and passes it on to Inngest inside the event so background steps join the same trace.

export type TraceCarrier = { 'sentry-trace'?: string; baggage?: string };

// Call inside an active span (e.g. an API route) to hand the trace to another process.
export function traceCarrier(): TraceCarrier {
  const { 'sentry-trace': sentryTrace, baggage } = Sentry.getTraceData();
  return { 'sentry-trace': sentryTrace, baggage };
}

// A child span of whatever is active. Failures mark the span as errored and are rethrown.
export function span<T>(
  name: string,
  op: string,
  attrs: Attrs | undefined,
  fn: () => Promise<T>,
): Promise<T> {
  return Sentry.startSpan({ name, op, attributes: attrs }, fn);
}

// Root span for work that starts outside a request (an Inngest step), joined to the trace
// that queued it. Flushes afterwards because the process may be frozen once the step ends.
export async function runInTrace<T>(
  carrier: TraceCarrier | undefined,
  name: string,
  attrs: Attrs,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await Sentry.continueTrace(
      { sentryTrace: carrier?.['sentry-trace'], baggage: carrier?.baggage },
      () => Sentry.startSpan({ name, op: 'queue.process', attributes: attrs }, fn),
    );
  } finally {
    await Sentry.flush(2000);
  }
}

// Wraps one HTTP request in a server span that continues the app's trace.
export function runRequest(request: Request, fn: (span: Sentry.Span) => Promise<Response>) {
  const url = new URL(request.url);
  // Collapse ids so every trip shares one transaction name.
  const path = url.pathname.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/gi, ':id');
  return Sentry.continueTrace(
    {
      sentryTrace: request.headers.get('sentry-trace') ?? undefined,
      baggage: request.headers.get('baggage') ?? undefined,
    },
    () =>
      Sentry.startSpan(
        {
          name: `${request.method} ${path}`,
          op: 'http.server',
          attributes: {
            'http.request.method': request.method,
            'sentry.source': 'route',
          },
        },
        fn,
      ),
  );
}

// --- AI agent monitoring -----------------------------------------------------------------
// Spans follow Sentry's gen_ai conventions so they show up under AI Agents: one
// `gen_ai.invoke_agent` span per assistant turn with a `gen_ai.chat` span per model call inside.

// Prompts and replies are user conversations. They are recorded in development; in production
// they are off unless SENTRY_RECORD_AI_CONTENT=1. Models, token counts and timings always are.
export const recordAiContent =
  process.env.NODE_ENV !== 'production' || process.env.SENTRY_RECORD_AI_CONTENT === '1';

// Groups every turn of one chat together in Sentry. The id comes from the app's chat session.
export function setConversationId(id: string | undefined) {
  if (id) Sentry.setConversationId(id);
}

type AiAttrs = Record<string, string | number | boolean>;

// Like `span`, but hands over the span so the caller can add response fields and token usage,
// and marks it errored with a low-cardinality `error.type` when the callback throws.
export function aiSpan<T>(
  op: 'gen_ai.invoke_agent' | 'gen_ai.chat',
  name: string,
  attrs: AiAttrs,
  fn: (span: Sentry.Span) => Promise<T>,
): Promise<T> {
  return Sentry.startSpan({ name, op, attributes: attrs }, async (s) => {
    try {
      return await fn(s);
    } catch (error) {
      s.setAttribute('error.type', error instanceof Error ? error.name : 'Error');
      throw error;
    }
  });
}

export const setHttpStatus = Sentry.setHttpStatus;
export const activeSpan = Sentry.getActiveSpan;
