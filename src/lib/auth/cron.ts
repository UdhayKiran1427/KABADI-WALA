import { apiError } from "@/lib/apiResponse";
import { getSecret } from "./secrets";

/** Returns the 401 response if the request lacks the cron bearer secret, otherwise null. */
export function rejectUnlessCron(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${getSecret("CRON_SECRET")}`) {
    return apiError("UNAUTHORIZED", "Invalid cron authorization header", 401);
  }
  return null;
}
