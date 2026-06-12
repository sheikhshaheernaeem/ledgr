import { redirect } from "next/navigation";

// Legacy /service route — superseded by /firm/queue (cross-client work) and
// /admin/metrics (MRR / churn / growth).
export default function ServiceRedirect() {
  redirect("/firm/queue");
}
