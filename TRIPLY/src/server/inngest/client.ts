import { Inngest } from 'inngest';

// Dev only: INNGEST_DEV=1 (in .env) makes the SDK talk to the local Dev Server.
// No INNGEST_EVENT_KEY / INNGEST_SIGNING_KEY are configured.
export const inngest = new Inngest({ id: 'triply' });
