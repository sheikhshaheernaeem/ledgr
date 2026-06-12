import { redirect } from "next/navigation";

// Legacy /bookkeeping-clients route — superseded by /firm (Clients).
export default function BookkeepingClientsRedirect() {
  redirect("/firm");
}
