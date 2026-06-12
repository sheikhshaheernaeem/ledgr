import { redirect } from "next/navigation";

// Folded into Reports → Transactions tab. We do the categorization; you read the books.
export default function TransactionsRedirect() {
  redirect("/client/reports?tab=transactions");
}
