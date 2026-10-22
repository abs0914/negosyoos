import type { Metadata } from "next";

import { ContentPage } from "../marketing-page-shell";

export const metadata: Metadata = { title: "Privacy policy", description: "How negosyoOS handles account, assessment, and business workspace information." };

export default function PrivacyPage() {
  return <ContentPage eyebrow="Legal" title="Privacy policy" intro="This notice explains the main categories of information negosyoOS processes, why they are used, and the choices available to you.">
    <p className="text-sm"><b className="text-foreground">Last updated:</b> August 30, 2026</p>
    <section><h2>Information we process</h2><ul><li>Account information, such as your name, email address, authentication records, and account status.</li><li>Business workspace information, including business identity, team access, branches, customers, products, transactions, documents, and settings you choose to enter.</li><li>Assessment and onboarding answers used to prepare business-health results and recommendations.</li><li>Technical and security records needed to operate, troubleshoot, protect, and audit the service.</li></ul></section>
    <section><h2>Why we process it</h2><p>Information is used to provide requested features, authenticate users, enforce permissions, keep tenant records separate, generate owner-requested reports or recommendations, maintain security, respond to support requests, and meet applicable legal obligations.</p></section>
    <section><h2>Access and service providers</h2><p>Workspace information is available to authorized members according to the permissions configured by the business. Infrastructure and service providers may process limited information on our behalf where needed to operate the service, subject to appropriate safeguards and applicable agreements.</p></section>
    <section><h2>Retention and security</h2><p>Information is retained for as long as needed to provide the service, maintain legitimate business and security records, resolve disputes, or comply with legal obligations. negosyoOS uses tenant isolation, permission checks, private file storage, and audit controls, but no online service can promise absolute security.</p></section>
    <section><h2>Your privacy rights</h2><p>Subject to applicable law, you may have rights to be informed, access information, object to processing, correct inaccurate information, request erasure or blocking, receive portable data, claim damages, or file a complaint. The Philippine National Privacy Commission provides an <a href="https://privacy.gov.ph/data-subject-rights/" rel="noopener noreferrer" target="_blank">official overview of data-subject rights</a>.</p></section>
    <section><h2>Contact and complaints</h2><p>Use the <a href="/contact">contact page</a> for privacy requests and identify the account or business concerned without sending passwords or sensitive records. You may also contact or file a complaint with the <a href="https://privacy.gov.ph/" rel="noopener noreferrer" target="_blank">National Privacy Commission</a>.</p></section>
    <section><h2>Changes to this notice</h2><p>We may update this notice as the service, providers, or legal requirements change. The latest version and its update date will remain available on this page.</p></section>
  </ContentPage>;
}
