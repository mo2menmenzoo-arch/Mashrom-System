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
