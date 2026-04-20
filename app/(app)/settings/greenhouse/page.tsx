import { getOrgSettingsAction } from "@/actions/settings";
import { GreenhouseForm } from "./greenhouse-form";

export default async function GreenhousePage() {
  const { greenhouse } = await getOrgSettingsAction();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">إعدادات الصوبة</h1>
        <p className="text-sm text-muted-foreground">القيم الافتراضية عند إنشاء دورة جديدة</p>
      </div>
      <GreenhouseForm defaults={greenhouse} />
    </div>
  );
}
