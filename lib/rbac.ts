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
  cycleRead: [Role.ADMIN, Role.OPERATOR, Role.ACCOUNTANT, Role.VIEWER] as Role[],
  expenseWrite: [Role.ADMIN, Role.OPERATOR] as Role[],
  operationsWrite: [Role.ADMIN, Role.OPERATOR] as Role[],
  inventoryWrite: [Role.ADMIN, Role.OPERATOR] as Role[],
  salesWrite: [Role.ADMIN, Role.ACCOUNTANT] as Role[],
  custodyWrite: [Role.ADMIN, Role.ACCOUNTANT] as Role[],
  reportsRead: [Role.ADMIN, Role.OPERATOR, Role.ACCOUNTANT, Role.VIEWER] as Role[],
  usersManage: [Role.ADMIN] as Role[],
};

export type EffectivePerms = {
  viewOperations: boolean;
  editOperations: boolean;
  viewSales: boolean;
  editSales: boolean;
  viewInventory: boolean;
  editInventory: boolean;
  viewExpenses: boolean;
  editExpenses: boolean;
  viewCustody: boolean;
  editCustody: boolean;
  viewReports: boolean;
  canViewFinancials: boolean;
  canViewPartners: boolean;
};

const ROLE_DEFAULT_PERMS: Record<Role, EffectivePerms> = {
  [Role.ADMIN]: {
    viewOperations: true, editOperations: true,
    viewSales: true, editSales: true,
    viewInventory: true, editInventory: true,
    viewExpenses: true, editExpenses: true,
    viewCustody: true, editCustody: true,
    viewReports: true,
    canViewFinancials: true,
    canViewPartners: true,
  },
  [Role.OPERATOR]: {
    viewOperations: true, editOperations: true,
    viewSales: true, editSales: false,
    viewInventory: true, editInventory: true,
    viewExpenses: true, editExpenses: true,
    viewCustody: true, editCustody: false,
    viewReports: true,
    canViewFinancials: false,
    canViewPartners: false,
  },
  [Role.ACCOUNTANT]: {
    viewOperations: true, editOperations: false,
    viewSales: true, editSales: true,
    viewInventory: true, editInventory: false,
    viewExpenses: true, editExpenses: false,
    viewCustody: true, editCustody: true,
    viewReports: true,
    canViewFinancials: false,
    canViewPartners: false,
  },
  [Role.VIEWER]: {
    viewOperations: true, editOperations: false,
    viewSales: true, editSales: false,
    viewInventory: true, editInventory: false,
    viewExpenses: true, editExpenses: false,
    viewCustody: true, editCustody: false,
    viewReports: true,
    canViewFinancials: false,
    canViewPartners: false,
  },
};

export async function getUserEffectivePerms(userId: string): Promise<EffectivePerms> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, permissions: true },
  });
  if (!user) throw new AuthorizationError("المستخدم غير موجود");

  if (user.role === Role.ADMIN) return ROLE_DEFAULT_PERMS[Role.ADMIN];

  if (!user.permissions) return ROLE_DEFAULT_PERMS[user.role];

  const p = user.permissions;
  return {
    viewOperations: p.viewOperations,
    editOperations: p.editOperations,
    viewSales: p.viewSales,
    editSales: p.editSales,
    viewInventory: p.viewInventory,
    editInventory: p.editInventory,
    viewExpenses: p.viewExpenses,
    editExpenses: p.editExpenses,
    viewCustody: p.viewCustody,
    editCustody: p.editCustody,
    viewReports: p.viewReports,
    canViewFinancials: false,
    canViewPartners: false,
  };
}

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
