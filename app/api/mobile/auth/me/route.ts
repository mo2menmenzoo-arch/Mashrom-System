import { withMobileAuth } from "@/lib/mobile-auth";
import { getUserEffectivePerms } from "@/lib/rbac";

export const GET = withMobileAuth(async (_req, user) => {
  const perms = await getUserEffectivePerms(user.id);
  return Response.json({ user: { ...user, perms } });
});
