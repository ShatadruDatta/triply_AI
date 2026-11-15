import { serve } from 'inngest/edge';

import { functions } from '@/server/inngest/functions';
import { inngest } from '@/server/inngest/client';

const handler = serve({ client: inngest, functions });

export const GET = handler;
export const POST = handler;
export const PUT = handler;
