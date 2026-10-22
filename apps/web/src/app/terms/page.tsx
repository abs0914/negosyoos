import type { Metadata } from "next";

import { ContentPage } from "../marketing-page-shell";

export const metadata: Metadata = { title: "Terms and conditions", description: "Terms governing access to and use of negosyoOS." };

export default function TermsPage() {
  return <ContentPage eyebrow="Legal" title="Terms and conditions" intro="These terms describe the basic rules for accessing and using negosyoOS. A separate signed service agreement, if any, takes priority where it expressly conflicts with these terms.">
    <p className="text-sm"><b className="text-foreground">Last updated:</b> August 30, 2026</p>
    <section><h2>1. Acceptance and authority</h2><p>By creating an account or using negosyoOS, you agree to these terms. If you use the service for a business or organization, you confirm that you are authorized to act for it and to manage the information submitted to its workspace.</p></section>
    <section><h2>2. Accounts and access</h2><p>You are responsible for accurate account information, safeguarding your credentials, and activity performed through your account. Business owners and authorized administrators control workspace membership, roles, permissions, enabled modules, and branding.</p></section>
    <section><h2>3. Your business information</h2><p>You retain responsibility for information entered or uploaded to your workspace. You grant the limited permission needed to host, process, back up, and display that information solely to operate and support the service. You must have the necessary authority and lawful basis to submit information about customers, employees, suppliers, and other people.</p></section>
    <section><h2>4. Acceptable use</h2><p>You may not use the service to violate law, infringe rights, access another tenant without authorization, distribute malicious code, disrupt the platform, bypass security controls, or upload unlawful or harmful material.</p></section>
    <section><h2>5. Recommendations and business decisions</h2><p>Assessments, dashboards, automation suggestions, and AI-assisted outputs are operational aids. They may be incomplete or require review and do not replace accounting, tax, legal, employment, financial, or other professional advice. You remain responsible for business decisions and approvals.</p></section>
    <section><h2>6. Availability and changes</h2><p>Features may be improved, replaced, suspended, or discontinued. Planned maintenance, provider outages, security events, or circumstances outside reasonable control may affect availability. Where practical, material changes will be communicated through the service.</p></section>
    <section><h2>7. Suspension and termination</h2><p>Access may be limited or suspended to protect users, investigate misuse, comply with law, address non-payment under an applicable subscription, or prevent harm. You may stop using the service at any time, subject to any separate subscription or service agreement.</p></section>
    <section><h2>8. Disclaimers and responsibility</h2><p>The service is provided subject to applicable law and any express commitments in a separate agreement. To the extent permitted by law, negosyoOS is not responsible for indirect or consequential losses arising from unavailable service, user error, unauthorized credential use, third-party systems, or decisions made from unreviewed recommendations.</p></section>
    <section><h2>9. Governing law</h2><p>These terms are governed by the laws of the Republic of the Philippines, without limiting rights that cannot lawfully be waived.</p></section>
    <section><h2>10. Contact and updates</h2><p>Questions may be sent through the <a href="/contact">contact page</a>. We may update these terms as the service changes; continued use after an updated version becomes effective constitutes acceptance where permitted by law.</p></section>
  </ContentPage>;
}
