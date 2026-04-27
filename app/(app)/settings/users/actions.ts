"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireRole, perms } from "@/lib/rbac";

export async function updateUserRole(userId: string, role: Role) {
  await requireRole(perms.usersManage);
  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/settings/users");
}

export async function toggleUserActive(userId: string) {
  await requireRole(perms.usersManage);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { active: true } });
  await prisma.user.update({ where: { id: userId }, data: { active: !user.active } });
  revalidatePath("/settings/users");
}

export type PermissionsInput = {
  viewOperations: boolean; editOperations: boolean;
  viewSales: boolean;      editSales: boolean;
  viewInventory: boolean;  editInventory: boolean;
  viewExpenses: boolean;   editExpenses: boolean;
  viewCustody: boolean;    editCustody: boolean;
  viewReports: boolean;
};

export async function upsertUserPermissionsAction(userId: string, data: PermissionsInput) {
  await requireRole(perms.usersManage);
  await prisma.userPermissions.upsert({
    where: { userId },
    update: { ...data },
    create: { userId, ...data },
  });
  revalidatePath("/settings/users");
}

export async function deleteUserPermissionsAction(userId: string) {
  await requireRole(perms.usersManage);
  await prisma.userPermissions.deleteMany({ where: { userId } });
  revalidatePath("/settings/users");
}
