import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { CycleStatus, Role } from "@prisma/client";

export class AuthorizationError extends Error {
  constructor(message = "غير مصرح") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class CycleClosedError extends Error {
  constructor(message = "الدورة مغلقة — تعديلها يتطلب صلاحية المدير وسبب صريح") {
    super(message);
    this.name = "CycleClosedError";
  }
}

export async function getSessionUser() {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) {
    throw new AuthorizationError("يجب تسجيل الدخول");
  }
  return {
    id: session.user.id,
    role: session.user.role as Role,
    email: session.user.email ?? "",
    name: session.user.name ?? "",
  };
}

export async function requireRole(allowed: Role[]) {
  const user = await getSessionUser();
  if (!allowed.includes(user.role)) {
    throw new AuthorizationError("ليست لديك الصلاحية لهذا الإجراء");
  }
  return user;
}

/**
 * Module-level permissions. Every server action starts with one of these.
 * Admin always passes. Operator/Accountant scoped per spec.
 */
export const perms = {
  cycleManage: [Role.ADMIN] as Role[],
  cycleRead: [Role.ADMIN, Role.OPERATOR, Role.ACCOUNTANT] as Role[],
  expenseWrite: [Role.ADMIN, Role.OPERATOR] as Role[],
  operationsWrite: [Role.ADMIN, Role.OPERATOR] as Role[],
  inventoryWrite: [Role.ADMIN, Role.OPERATOR] as Role[],
  salesWrite: [Role.ADMIN, Role.ACCOUNTANT] as Role[],
  custodyWrite: [Role.ADMIN, Role.ACCOUNTANT] as Role[],
  reportsRead: [Role.ADMIN, Role.OPERATOR, Role.ACCOUNTANT] as Role[],
  usersManage: [Role.ADMIN] as Role[],
};

/**
 * Guard for mutations on records belonging to a cycle.
 * Closed cycles are immutable unless ADMIN provides an override reason.
 */
export async function assertCycleOpen(
  cycleId: string,
  opts: { allowOverride?: boolean; reason?: string; userRole: Role } = {
    userRole: Role.OPERATOR,
  },
): Promise<{ overridden: boolean }> {
  const cycle = await prisma.cycle.findUnique({
    where: { id: cycleId },
    select: { status: true },
  });
  if (!cycle) throw new AuthorizationError("الدورة غير موجودة");
  if (cycle.status !== CycleStatus.ENDED) return { overridden: false };

  if (
    opts.allowOverride &&
    opts.userRole === Role.ADMIN &&
    typeof opts.reason === "string" &&
    opts.reason.trim().length > 0
  ) {
    return { overridden: true };
  }
  throw new CycleClosedError();
}
