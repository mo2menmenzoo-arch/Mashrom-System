import { withMobileAuth } from "@/lib/mobile-auth";
import { getDashboardData } from "@/lib/dashboard";

export const GET = withMobileAuth(async () => {
  const data = await getDashboardData();
  return Response.json(data);
});
