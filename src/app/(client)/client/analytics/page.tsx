import { redirect } from "next/navigation";

// Folded into My Books — same data, cleaner home.
export default function AnalyticsRedirect() {
  redirect("/client/financials");
}
