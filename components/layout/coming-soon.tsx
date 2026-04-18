import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ComingSoon({
  title,
  description,
  milestone,
}: {
  title: string;
  description: string;
  milestone: string;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{title}</h1>
        <Badge variant="secondary">{milestone}</Badge>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">قيد التطوير</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            هذه الوحدة ضمن خطة العمل المعتمدة وسيتم تسليمها قريباً بعد الانتهاء من المراحل السابقة.
            يمكنك الرجوع إلى خطة المشروع للاطلاع على جدول التسليم الكامل.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
