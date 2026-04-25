import Link from "next/link";
import { Plus, Sprout } from "lucide-react";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatInt } from "@/lib/format";
import { CreateGreenhouseForm } from "./greenhouse-form";

export const dynamic = "force-dynamic";

export default async function GreenhousesPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  const greenhouses = await prisma.greenhouse.findMany({
    where: { organizationId: "default-org" },
    orderBy: { number: "asc" },
    include: {
      _count: { select: { cycles: true, foundingExpenses: true } },
      settings: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">الصوب</h1>
        <p className="text-sm text-muted-foreground">إدارة الصوب وإعداداتها ومصاريف التأسيس</p>
      </div>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4" />
              إضافة صوبة جديدة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CreateGreenhouseForm />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {greenhouses.map((g) => (
          <Card key={g.id} className="hover:bg-muted/30 transition-colors">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                    <Sprout className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">{g.name}</p>
                    <p className="text-xs text-muted-foreground">صوبة رقم {g.number}</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">الدورات</p>
                  <p className="font-medium tabular-nums">{formatInt(g._count.cycles)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">مصاريف التأسيس</p>
                  <p className="font-medium tabular-nums">{formatInt(g._count.foundingExpenses)}</p>
                </div>
              </div>
              <Link
                href={`/settings/greenhouses/${g.id}`}
                className="mt-4 block text-center text-sm text-primary hover:underline"
              >
                الإعدادات والتفاصيل ←
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
