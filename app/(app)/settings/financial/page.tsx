import { getOrgSettingsAction } from "@/actions/settings";
import { FinancialForm } from "./financial-form";

export default async function FinancialPage() {
  const { financial } = await getOrgSettingsAction();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">الإعدادات المالية</h1>
        <p className="text-sm text-muted-foreground">العملة الافتراضية ونسبة الضريبة</p>
      </div>
      <FinancialForm defaults={financial} />
    </div>
  );
}
