import { requireUser } from '@/server/auth';
import { json, route } from '@/server/http';
import { getQuota } from '@/server/quota';

export const GET = route(async (request: Request) => {
  const user = await requireUser(request);
  return json({
    user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
    quota: await getQuota(user.id),
  });
});
