import * as Sentry from '@sentry/react';

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION || '1.0.0',
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event) {
      if (import.meta.env.DEV) return null;
      return event;
    },
  });
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) {
    console.error('[Error]', error, context);
    return;
  }
  Sentry.withScope((scope) => {
    if (context) scope.setExtras(context);
    Sentry.captureException(error);
  });
}

export function setUser(user: { id: number; email: string; role: string } | null) {
  if (!import.meta.env.VITE_SENTRY_DSN) return;
  if (user) {
    Sentry.setUser({ id: String(user.id), email: user.email, role: user.role });
  } else {
    Sentry.setUser(null);
  }
}

export { Sentry };
