import type { Metadata } from "next";
import Link from "next/link";

import { ContentPage } from "../marketing-page-shell";

export const metadata: Metadata = { title: "About", description: "Learn why negosyoOS is being built for Philippine small businesses." };

export default function AboutPage() {
  return <ContentPage eyebrow="About negosyoOS" title="A clearer operating system for the everyday negosyo." intro="negosyoOS is built to help Philippine small-business owners understand what needs attention, organize daily work, and improve one practical step at a time.">
    <section><h2>Why we are building it</h2><p>Many owners already have the information they need, but it is scattered across notebooks, spreadsheets, chat threads, and separate apps. negosyoOS brings those moving parts into one workspace so decisions are easier to make and work is easier to follow.</p></section>
    <section><h2>Designed around the owner</h2><p>The product begins with a short business health assessment, then recommends a focused system for the business. Owners remain in control: enabled modules, team permissions, approvals, branding, and operating settings stay specific to each workspace.</p></section>
    <section><h2>Our product principles</h2><ul><li>Use practical language instead of unnecessary jargon.</li><li>Show evidence and real business records instead of invented performance claims.</li><li>Keep each business workspace separate and permission-aware.</li><li>Recommend changes, while leaving important decisions with the owner.</li></ul></section>
    <section className="rounded-2xl border bg-card p-6"><h2>Start with your business</h2><p>Take the free assessment to identify strengths, attention areas, and the most useful next step.</p><Link className="mt-4 inline-block" href="/assessment">Check your business health →</Link></section>
  </ContentPage>;
}
