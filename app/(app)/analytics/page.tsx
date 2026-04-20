import { BarChart2, TrendingUp, Package, Thermometer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAnalyticsData } from "@/lib/analytics";
import {
  NetProfitChart,
  ExpenseDistributionChart,
  CartonsChart,
  EnvChart,
} from "./analytics-charts";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const { pnl, env } = await getAnalyticsData();

  const isEmpty = pnl.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">التحليل البياني</h1>
        <p className="text-sm text-muted-foreground">
          رسوم بيانية للإنتاج والمصاريف والأرباح ومؤشرات البيئة عبر الدورات
        </p>
      </div>

      {isEmpty ? (
        <p className="py-16 text-center text-muted-foreground">
          لا توجد دورات بعد. أنشئ دورة أولاً لعرض التحليلات.
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4" />
                صافي الربح لكل دورة
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-2">
              <NetProfitChart cycles={pnl} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart2 className="h-4 w-4" />
                توزيع المصاريف الإجمالي
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-2">
              <ExpenseDistributionChart cycles={pnl} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4" />
                الكراتين المباعة لكل دورة
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-2">
              <CartonsChart cycles={pnl} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Thermometer className="h-4 w-4" />
                متوسط الحرارة والرطوبة لكل دورة
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-2">
              <EnvChart env={env} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
