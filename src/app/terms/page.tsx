import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection, LegalList } from "@/components/layout/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that govern your use of Ledgr's AI-native bookkeeping and accounting service.",
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="LEGAL"
      title="Terms of Service"
      updated="June 29, 2026"
      intro="These Terms of Service (the “Terms”) govern your access to and use of Ledgr’s websites, applications, and bookkeeping and accounting services (together, the “Service”). By creating an account, subscribing, or otherwise using the Service, you agree to these Terms. If you are using the Service on behalf of a business, you represent that you are authorized to bind that business to these Terms."
    >
      <LegalSection heading="1. Who we are">
        <p>
          Ledgr (“Ledgr,” “we,” “us,” or “our”) operates an AI-native accounting firm. We provide
          bookkeeping and related financial reporting as a service — our software and team do the work
          and deliver the output (clean books, monthly profit &amp; loss, balance sheet, cash flow, and
          tax-ready financials). Ledgr is not a law firm, tax-preparation firm, or registered investment
          advisor, and the Service does not constitute legal, tax, audit, or investment advice.
        </p>
      </LegalSection>

      <LegalSection heading="2. Eligibility and accounts">
        <p>
          You must be at least 18 years old and able to form a binding contract to use the Service. You
          are responsible for the accuracy of the information you provide and for all activity that occurs
          under your account. Keep your login credentials confidential and notify us promptly at{" "}
          <a className="text-cyan-500 hover:text-cyan-400" href="mailto:support@ledgr.app">
            support@ledgr.app
          </a>{" "}
          if you suspect unauthorized use.
        </p>
      </LegalSection>

      <LegalSection heading="3. The service">
        <p>
          Ledgr combines automated processing with human review. Our AI systems parse documents, classify
          transactions, and flag anomalies; qualified members of our accounting team review reports before
          they are delivered to you. You acknowledge that:
        </p>
        <LegalList
          items={[
            "The quality and timeliness of our output depends on the accuracy and completeness of the data, bank feeds, and documents you provide.",
            "Automated categorization may require correction, and you are responsible for reviewing deliverables and notifying us of errors in a reasonable time.",
            "We may use third-party providers (for example, cloud hosting, bank-connection providers, and AI model providers) to deliver the Service.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="4. Subscriptions, billing, and payments">
        <p>
          The Service is offered on a subscription basis. Pricing for each plan is shown on our{" "}
          <Link className="text-cyan-500 hover:text-cyan-400" href="/#pricing">
            pricing page
          </Link>
          . Unless stated otherwise, subscriptions are billed monthly in advance and renew automatically
          until cancelled. Where we offer a free first month or trial, you will not be charged for that
          period and may cancel before it ends to avoid the next charge.
        </p>
        <p>
          Our payments and subscriptions are processed by{" "}
          <a
            className="text-cyan-500 hover:text-cyan-400"
            href="https://www.paddle.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Paddle.com
          </a>
          , our authorized reseller and Merchant of Record. When you purchase a subscription, your order
          and payment are fulfilled by Paddle, and Paddle’s{" "}
          <a
            className="text-cyan-500 hover:text-cyan-400"
            href="https://www.paddle.com/legal/checkout-buyer-terms"
            target="_blank"
            rel="noopener noreferrer"
          >
            Buyer Terms
          </a>{" "}
          also apply to that transaction. Paddle handles billing, invoicing, and applicable sales tax/VAT.
          You authorize Paddle to charge your selected payment method for the recurring subscription fee
          plus any applicable taxes until you cancel.
        </p>
      </LegalSection>

      <LegalSection heading="5. Cancellation">
        <p>
          You may cancel your subscription at any time from your account settings or by contacting{" "}
          <a className="text-cyan-500 hover:text-cyan-400" href="mailto:support@ledgr.app">
            support@ledgr.app
          </a>
          . Cancellation stops future renewals; it takes effect at the end of your current billing period,
          and you retain access until then. Refunds, where applicable, are governed by our{" "}
          <Link className="text-cyan-500 hover:text-cyan-400" href="/refunds">
            Refund Policy
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection heading="6. Your responsibilities">
        <LegalList
          items={[
            "Provide complete, accurate, and lawful financial data and supporting documents.",
            "Maintain your own records as required by law; Ledgr is a service provider, not your statutory record-keeper of last resort.",
            "Use the Service only for lawful purposes and not to launder funds, evade tax, or misrepresent your finances.",
            "Review deliverables and respond to our requests for information in a timely manner.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="7. Intellectual property">
        <p>
          Ledgr and its licensors own all rights in the Service, including our software, models, and
          branding. We grant you a limited, non-exclusive, non-transferable right to use the Service during
          your subscription. You retain ownership of the financial data and documents you submit (“Your
          Content”), and you grant us the rights necessary to process Your Content to provide the Service.
        </p>
      </LegalSection>

      <LegalSection heading="8. Confidentiality and data">
        <p>
          We treat your financial information as confidential and handle personal data in accordance with
          our{" "}
          <Link className="text-cyan-500 hover:text-cyan-400" href="/privacy">
            Privacy Policy
          </Link>
          . You are responsible for ensuring you have the right to share any third-party data with us.
        </p>
      </LegalSection>

      <LegalSection heading="9. Disclaimers">
        <p>
          The Service is provided “as is” and “as available.” To the maximum extent permitted by law, we
          disclaim all warranties, express or implied, including merchantability, fitness for a particular
          purpose, and non-infringement. We do not warrant that the Service will be uninterrupted,
          error-free, or that deliverables will satisfy every regulatory or tax authority without your own
          review and that of your tax advisor.
        </p>
      </LegalSection>

      <LegalSection heading="10. Limitation of liability">
        <p>
          To the maximum extent permitted by law, Ledgr and its officers, employees, and suppliers will not
          be liable for any indirect, incidental, special, consequential, or punitive damages, or for lost
          profits, revenues, or data. Our total liability for any claim arising out of or relating to the
          Service will not exceed the amount you paid to Ledgr for the Service in the twelve (12) months
          preceding the event giving rise to the claim.
        </p>
      </LegalSection>

      <LegalSection heading="11. Indemnification">
        <p>
          You agree to indemnify and hold Ledgr harmless from any claims, losses, or expenses arising from
          your breach of these Terms, your misuse of the Service, or the inaccuracy of the data you provide.
        </p>
      </LegalSection>

      <LegalSection heading="12. Suspension and termination">
        <p>
          We may suspend or terminate your access if you breach these Terms, fail to pay, or use the Service
          unlawfully. You may stop using the Service at any time. Sections that by their nature should
          survive termination (including payment obligations, disclaimers, and limitations of liability)
          will survive.
        </p>
      </LegalSection>

      <LegalSection heading="13. Changes to these Terms">
        <p>
          We may update these Terms from time to time. If we make material changes, we will update the
          “Last updated” date above and, where appropriate, notify you. Your continued use of the Service
          after changes take effect constitutes acceptance of the revised Terms.
        </p>
      </LegalSection>

      <LegalSection heading="14. Governing law">
        <p>
          These Terms are governed by the laws applicable at Ledgr’s principal place of business, without
          regard to conflict-of-law rules. Any disputes will be resolved in the competent courts of that
          jurisdiction, unless mandatory local consumer law provides otherwise.
        </p>
      </LegalSection>

      <LegalSection heading="15. Contact">
        <p>
          Questions about these Terms? Email us at{" "}
          <a className="text-cyan-500 hover:text-cyan-400" href="mailto:hello@ledgr.app">
            hello@ledgr.app
          </a>{" "}
          or visit our{" "}
          <Link className="text-cyan-500 hover:text-cyan-400" href="/contact">
            contact page
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
