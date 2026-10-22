import type { Metadata } from "next";
import Link from "next/link";

import { ContentPage } from "../marketing-page-shell";

export const metadata: Metadata = { title: "Contact us", description: "Get product, account, privacy, or partnership help for negosyoOS." };

export default function ContactPage() {
  return <ContentPage eyebrow="Contact us" title="How can we help your negosyo?" intro="Choose the most relevant support path below. Please do not include passwords, payment credentials, or sensitive customer records in an initial inquiry.">
    <section className="grid gap-4 sm:grid-cols-2"><article className="rounded-2xl border bg-card p-6"><h2>Product and account help</h2><p>Already using negosyoOS? Sign in and open Negosyo Coach from your business workspace for setup guidance and product help.</p><Link className="mt-4 inline-block" href="/login">Sign in to your workspace →</Link></article><article className="rounded-2xl border bg-card p-6"><h2>Business support and partnerships</h2><p>For business-support services, implementation conversations, or partnership inquiries, contact PhilVirtualOffice through its official website.</p><a className="mt-4 inline-block" href="https://philvirtualoffice.com/" rel="noopener noreferrer" target="_blank">Visit PhilVirtualOffice →</a></article></section>
    <section><h2>Privacy requests</h2><p>If your request concerns access, correction, deletion, portability, or another privacy right, identify it clearly when contacting support. We may need to verify your identity and authority over the relevant account before acting.</p><Link href="/privacy">Read the privacy policy →</Link></section>
  </ContentPage>;
}
