import { withMobileAuth } from "@/lib/mobile-auth";
import { getAnalyticsData } from "@/lib/analytics";

export const GET = withMobileAuth(async () => {
  return Response.json(await getAnalyticsData());
});
