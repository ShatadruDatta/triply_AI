import * as Sentry from '@sentry/react-native';

// Reports an unexpected client-side error to Sentry. Never pass tokens or personal data.
export function reportClientError(error: unknown) {
  Sentry.captureException(error);
}
