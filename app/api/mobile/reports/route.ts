import { withMobileAuth } from "@/lib/mobile-auth";
import { getAllCyclesPnL, getAllGreenhousesPnL } from "@/lib/reports";

export const GET = withMobileAuth(async (req) => {
  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view") ?? "cycles";
  const greenhouseId = searchParams.get("greenhouseId") ?? undefined;
  if (view === "greenhouses") return Response.json(await getAllGreenhousesPnL());
  return Response.json(await getAllCyclesPnL(greenhouseId));
});
