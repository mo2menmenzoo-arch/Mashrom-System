import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PieChart } from "lucide-react";
import { PartnerSharesForm } from "./partners-form";

export default function PartnersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">توزيع أرباح الشركاء</h1>
        <p className="text-sm text-muted-foreground">تحكم في توزيع صافي الربح بين الشركاء بالنسب المئوية</p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 pb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500">
            <PieChart className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base">النسبة المئوية للشركاء</CardTitle>
            <CardDescription>تحكم في توزيع صافي الربح بين الشركاء بالنسب المئوية.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <PartnerSharesForm />
        </CardContent>
      </Card>
    </div>
  );
}
