import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function PartnersLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/dashboard");
  return <>{children}</>;
}
