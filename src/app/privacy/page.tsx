import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection, LegalList } from "@/components/layout/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy — Ledgr",
  description:
    "How Ledgr collects, uses, protects, and shares your personal and financial information.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="LEGAL"
      title="Privacy Policy"
      updated="June 29, 2026"
      intro="This Privacy Policy explains how Ledgr collects, uses, shares, and protects information when you use our websites and bookkeeping service. We take the privacy of your financial data seriously — handling it securely is core to what we do."
    >
      <LegalSection heading="1. Information we collect">
        <p>We collect the following categories of information:</p>
        <LegalList
          items={[
            "Account information — your name, business name, email address, and password when you register.",
            "Financial data — bank and credit-card transactions, invoices, bills, receipts, statements, and other documents you upload or connect for bookkeeping.",
            "Billing information — handled by our payment processor, Paddle; we receive limited details such as your plan, billing country, and the last four digits of your card, but not your full card number.",
            "Usage data — log data, device and browser information, IP address, and how you interact with the Service, collected via cookies and similar technologies.",
            "Communications — messages you send to our team and the contents of support requests.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="2. How we use your information">
        <LegalList
          items={[
            "To provide the Service — categorize transactions, produce financial reports, and have our accountants review deliverables.",
            "To operate AI-assisted processing — our and our providers' models parse and classify your data to generate books and flag anomalies.",
            "To manage billing and subscriptions through our payment processor.",
            "To communicate with you about your account, deliverables, and support requests.",
            "To secure, maintain, and improve the Service, and to comply with legal and regulatory obligations.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="3. AI processing">
        <p>
          Ledgr is AI-native. We use automated models to parse documents, classify transactions, and detect
          anomalies, with human review before reports reach you. We do not sell your financial data, and we
          do not permit our model providers to use your data to train their general-purpose models except as
          needed to deliver the Service to you. Where we use third-party AI providers, your data is processed
          under agreements that restrict use to providing the Service.
        </p>
      </LegalSection>

      <LegalSection heading="4. How we share information">
        <p>We share information only as needed to run the Service:</p>
        <LegalList
          items={[
            "Service providers — cloud hosting, database, bank-connection, email, and AI providers that process data on our behalf under confidentiality and data-protection terms.",
            "Payment processor — Paddle.com acts as our Merchant of Record and processes your payments; their handling of your payment data is governed by Paddle's own privacy policy.",
            "Legal and safety — when required by law, regulation, legal process, or to protect the rights, property, or safety of Ledgr, our users, or others.",
            "Business transfers — in connection with a merger, acquisition, or sale of assets, subject to this Policy.",
          ]}
        />
        <p>We do not sell your personal or financial information.</p>
      </LegalSection>

      <LegalSection heading="5. Payment data and Paddle">
        <p>
          Payments are processed by{" "}
          <a
            className="text-blue-500 hover:text-blue-400"
            href="https://www.paddle.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Paddle.com
          </a>
          , our authorized reseller and Merchant of Record. When you pay, your card and billing details are
          collected and processed directly by Paddle under{" "}
          <a
            className="text-blue-500 hover:text-blue-400"
            href="https://www.paddle.com/legal/privacy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Paddle&apos;s Privacy Policy
          </a>
          . Ledgr does not store your full payment card numbers.
        </p>
      </LegalSection>

      <LegalSection heading="6. Data retention">
        <p>
          We retain your information for as long as your account is active and as needed to provide the
          Service. After you close your account, we retain financial records for the period required to meet
          legal, tax, and accounting obligations, after which we delete or anonymize them. You may request
          deletion as described below, subject to those retention requirements.
        </p>
      </LegalSection>

      <LegalSection heading="7. Security">
        <p>
          We use industry-standard safeguards — encryption in transit, access controls, and secure
          infrastructure — to protect your data. No method of transmission or storage is completely secure,
          but we work to protect your information and to notify you of material incidents as required by law.
        </p>
      </LegalSection>

      <LegalSection heading="8. Your rights">
        <p>
          Depending on where you live, you may have the right to access, correct, export, or delete your
          personal information, to object to or restrict certain processing, and to withdraw consent. To
          exercise these rights, email{" "}
          <a className="text-blue-500 hover:text-blue-400" href="mailto:privacy@ledgr.app">
            privacy@ledgr.app
          </a>
          . We will respond within the timeframe required by applicable law.
        </p>
      </LegalSection>

      <LegalSection heading="9. Cookies">
        <p>
          We use cookies and similar technologies to keep you signed in, remember preferences, and
          understand usage. You can control cookies through your browser settings; disabling some cookies may
          affect how the Service works.
        </p>
      </LegalSection>

      <LegalSection heading="10. International transfers">
        <p>
          Your information may be processed in countries other than where you live. Where required, we use
          appropriate safeguards for such transfers.
        </p>
      </LegalSection>

      <LegalSection heading="11. Children's privacy">
        <p>
          The Service is intended for businesses and is not directed to children under 18. We do not
          knowingly collect personal information from children.
        </p>
      </LegalSection>

      <LegalSection heading="12. Changes to this Policy">
        <p>
          We may update this Policy from time to time. We will revise the “Last updated” date above and,
          for material changes, take reasonable steps to notify you.
        </p>
      </LegalSection>

      <LegalSection heading="13. Contact">
        <p>
          Questions about your privacy? Email{" "}
          <a className="text-blue-500 hover:text-blue-400" href="mailto:privacy@ledgr.app">
            privacy@ledgr.app
          </a>{" "}
          or reach us via our{" "}
          <Link className="text-blue-500 hover:text-blue-400" href="/contact">
            contact page
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
