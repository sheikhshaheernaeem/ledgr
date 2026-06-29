import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection, LegalList } from "@/components/layout/LegalPage";

export const metadata: Metadata = {
  title: "Refund Policy — Ledgr",
  description: "Ledgr's refund and cancellation policy for our monthly bookkeeping subscription.",
};

export default function RefundsPage() {
  return (
    <LegalPage
      eyebrow="LEGAL"
      title="Refund Policy"
      updated="June 29, 2026"
      intro="We want you to be confident in Ledgr. This policy explains when you can get a refund, how cancellation works, and how to request one. It applies to subscriptions to Ledgr's bookkeeping service."
    >
      <LegalSection heading="1. Free first month">
        <p>
          New customers can try Ledgr free for the first month. You won’t be charged during the free period,
          and you can cancel anytime before it ends with no payment due. If you don’t cancel, your paid
          monthly subscription begins automatically when the free period ends.
        </p>
      </LegalSection>

      <LegalSection heading="2. 14-day money-back guarantee">
        <p>
          If you are charged for your first paid month and are not satisfied, you may request a full refund
          within <span className="text-foreground font-medium">14 days</span> of that first charge. Contact
          us and we will refund that payment in full, no hard feelings.
        </p>
      </LegalSection>

      <LegalSection heading="3. Monthly subscription renewals">
        <p>
          Ledgr is billed monthly in advance. Because our team and systems perform work throughout each
          billing period, renewal charges are generally non-refundable once the new period has begun. That
          said, we review every request fairly — if something went wrong on our side, we’ll make it right.
        </p>
        <LegalList
          items={[
            "Cancel at any time to stop future renewals — see cancellation below.",
            "We may issue a partial or full refund at our discretion where a deliverable was not provided or contained a material error caused by Ledgr.",
            "Duplicate charges or billing errors are always refunded.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="4. Cancellation">
        <p>
          You can cancel your subscription at any time from your account settings or by emailing{" "}
          <a className="text-blue-500 hover:text-blue-400" href="mailto:support@ledgr.app">
            support@ledgr.app
          </a>
          . Cancellation stops future renewals and takes effect at the end of your current billing period —
          you keep access until then. Cancelling does not automatically refund the current period unless one
          of the conditions above applies.
        </p>
      </LegalSection>

      <LegalSection heading="5. How refunds are processed">
        <p>
          Payments and refunds are handled by{" "}
          <a
            className="text-blue-500 hover:text-blue-400"
            href="https://www.paddle.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Paddle.com
          </a>
          , our authorized reseller and Merchant of Record. Approved refunds are returned to your original
          payment method. It typically takes a few business days for the refund to appear, depending on your
          bank or card issuer. Paddle’s{" "}
          <a
            className="text-blue-500 hover:text-blue-400"
            href="https://www.paddle.com/legal/checkout-buyer-terms"
            target="_blank"
            rel="noopener noreferrer"
          >
            Buyer Terms
          </a>{" "}
          also apply to payments made through checkout.
        </p>
      </LegalSection>

      <LegalSection heading="6. How to request a refund">
        <p>
          Email{" "}
          <a className="text-blue-500 hover:text-blue-400" href="mailto:support@ledgr.app">
            support@ledgr.app
          </a>{" "}
          with the email address on your account and the charge you’d like reviewed. We aim to respond within
          one business day. You can also reach us via our{" "}
          <Link className="text-blue-500 hover:text-blue-400" href="/contact">
            contact page
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection heading="7. Statutory rights">
        <p>
          Nothing in this policy limits any non-waivable refund or cancellation rights you have under the
          consumer-protection laws of your jurisdiction. Where local law grants you stronger rights, those
          rights apply.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
