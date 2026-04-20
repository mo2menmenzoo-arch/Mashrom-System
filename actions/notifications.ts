"use server";

import { prisma } from "@/lib/db";
import { requireRole, perms } from "@/lib/rbac";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function subscribePushAction(subscription: {
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<ActionResult> {
  try {
    const user = await requireRole(perms.cycleRead);
    await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      create: { userId: user.id, ...subscription },
      update: {
        userId: user.id,
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    });
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "خطأ غير متوقع";
    return { ok: false, error: msg };
  }
}

export async function unsubscribePushAction(
  endpoint: string,
): Promise<ActionResult> {
  try {
    await requireRole(perms.cycleRead);
    await prisma.pushSubscription.deleteMany({ where: { endpoint } });
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "خطأ غير متوقع";
    return { ok: false, error: msg };
  }
}
