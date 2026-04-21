import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { UsersTable } from "./users-table";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
  });

  const rows = users.map((u) => ({
    ...u,
    formattedDate: formatDate(u.createdAt),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">إدارة المستخدمين</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          إدارة حسابات المستخدمين وصلاحياتهم
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            المستخدمون ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UsersTable users={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
