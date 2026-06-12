import { redirect } from "next/navigation";

// Legacy /dashboard route — superseded by /firm/queue (operator inbox).
// Anyone landing here lands on the queue instead.
export default function DashboardRedirect() {
  redirect("/firm/queue");
}
