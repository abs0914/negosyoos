import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@negosyo-os/ui";

import { LandingProductPreview } from "./landing-product-preview";
import { LandingWorldShowcase } from "./landing-world-showcase";
import { MarketingPageShell } from "./marketing-page-shell";
import "./homepage.css";

export const metadata: Metadata = {
  title: "Know what your business needs next",
  description: "Get a free business health report, find your priorities, and build a practical workspace for your Philippine small business.",
};

const businessTools = [
  { title: "Sell and get paid", description: "Follow a sale from the counter to the invoice.", detail: "POS · Sales · Quotations · Invoices", icon: "peso" },
  { title: "Keep stock moving", description: "See what’s available and what needs replenishing.", detail: "Catalog · Inventory · Purchasing · Deliveries", icon: "inventory" },
  { title: "Know your customers", description: "Keep customer details and follow-ups together.", detail: "Customers · Appointments · Loyalty", icon: "customers" },
  { title: "Bring the team together", description: "Give daily work a clear owner and next step.", detail: "Employees · Attendance · Approvals", icon: "team" },
] as const;

function SampleReport() {
  return (
    <figure className="assessment-example hero-enter hero-enter-delay-2">
      <div className="report-cover">
        <span className="report-brand"><Icon name="business" size={18} /> negosyoOS / Business health</span>
        <span className="example-tag">Illustrative report</span>
      </div>
      <div className="report-page">
        <div className="report-title"><div><p className="design-label">Retail & hardware</p><h2>Sampaguita Home Supply</h2></div><span className="report-edition" aria-hidden="true">01</span></div>
        <div className="report-summary">
          <div className="health-score" aria-label="Example overall health score, 62 out of 100"><strong>62<span>/100</span></strong><span>Business health</span></div>
          <div className="report-insight"><span className="design-label">A clearer place to start</span><p>Your sales routine is in place. Stock tracking needs attention.</p></div>
        </div>
        <dl className="report-scores">
          {[["Sales health", 80], ["Cash flow", 65], ["Inventory", 40]].map(([label, value]) => (
            <div key={label}><dt>{label}</dt><dd><span className="score-track" aria-hidden="true"><span style={{ transform: `scaleX(${Number(value) / 100})` }} /></span><b>{value}<span className="sr-only"> out of 100</span></b></dd></div>
          ))}
        </dl>
        <div className="report-priority"><span className="priority-number">1</span><div><p className="design-label">First priority</p><h3>Make stock levels visible.</h3><p>Start with a count of your fastest-selling items.</p></div><Icon name="inventory" size={23} /></div>
        <p className="report-footnote">Example scores and guidance. Your report is based on your answers.</p>
      </div>
      <figcaption><Icon name="file" size={16} /><span>A health score. Your strengths. Your next priorities.</span></figcaption>
    </figure>
  );
}

export default function HomePage() {
  return (
    <MarketingPageShell home>
      <main className="home home-v2" id="main-content">
        <section aria-labelledby="home-title" className="home-hero">
          <div className="site-width hero-grid">
            <div className="hero-copy">
              <p className="design-label hero-enter"><span className="label-dot" /> For Philippine small businesses</p>
              <h1 className="hero-enter hero-enter-delay-1" id="home-title">Your negosyo.<br />A clearer<br /><em>next step.</em></h1>
              <p className="hero-intro hero-enter hero-enter-delay-2">Find what needs attention in your business. Start with a free health check, then put the right tools to work.</p>
              <div className="hero-actions hero-enter hero-enter-delay-3">
                <Link className="site-button" href="/assessment">Check my business health <Icon name="chevron-right" size={17} /></Link>
                <a className="site-text-link" href="#how-it-works">What will I get? <span aria-hidden="true">↓</span></a>
              </div>
              <p className="hero-note"><Icon name="attendance" size={14} /> About 5 minutes <span aria-hidden="true">·</span> No account or payment needed</p>
            </div>
            <SampleReport />
          </div>
          <div className="site-width hero-bottom"><a className="hero-world-link" href="#world"><b>New</b> See your whole business in 3D <span aria-hidden="true">↓</span></a><span>Assess <span aria-hidden="true">→</span> Prioritize <span aria-hidden="true">→</span> Take action</span></div>
        </section>

        <section className="site-width report-explainer" id="how-it-works" aria-labelledby="report-heading">
          <div className="home-section-heading"><p className="design-label">01 / Understand your business</p><h2 id="report-heading">Five minutes.<br />A useful starting point.</h2></div>
          <div className="report-explainer-copy"><p className="section-intro">Answer practical questions about how you sell, manage cash, track stock, and organize daily work.</p><ol className="report-deliverables">
            <li><span>01</span><div><h3>See the whole picture</h3><p>Get an overall health score and a breakdown of your business areas.</p></div></li>
            <li><span>02</span><div><h3>Find your next priorities</h3><p>Understand your strengths and the three opportunities to focus on first.</p></div></li>
            <li><span>03</span><div><h3>Build from your results</h3><p>Create an account to carry your assessment into a business workspace and explore recommended tools.</p></div></li>
          </ol><p className="privacy-note"><Icon name="shield" size={17} /> Your assessment answers stay on this device until you create your workspace.</p></div>
        </section>

        <LandingWorldShowcase />

        <section className="workflow-section" id="product-preview" aria-labelledby="workflow-heading">
          <div className="site-width home-section">
            <div className="workflow-heading"><div className="home-section-heading"><p className="design-label">03 / Put it into practice</p><h2 id="workflow-heading">From “ubos na?”<br />to a plan to restock.</h2></div><p className="section-intro">Follow a hardware store through one everyday task. Explore how an inventory alert becomes a draft purchase order.</p></div>
            <LandingProductPreview />
          </div>
        </section>

        <section className="site-width home-section" id="manage" aria-labelledby="tools-heading">
          <div className="tools-heading"><div className="home-section-heading"><p className="design-label">04 / Make it your workspace</p><h2 id="tools-heading">The tools for<br />your kind of work.</h2></div><p className="section-intro">Start with the priorities in your report. Bring more of your operations together as you need them.</p></div>
          <div className="module-grid">{businessTools.map(({ title, description, detail, icon }, index) => (
            <article className="module-tile" key={title}><div className="module-top"><Icon name={icon} size={26} /><span className="design-label">0{index + 1}</span></div><h3>{title}</h3><p>{description}</p><p className="module-detail">{detail}</p></article>
          ))}</div>
          <div className="business-types"><p className="design-label">Made for local business</p><p>Retail & hardware · Food & restaurants · Salons & services · Repair & laundry · Professional services · Wholesale</p></div>
        </section>

        <section className="home-questions" aria-labelledby="questions-heading">
          <div className="site-width question-grid"><div className="home-section-heading"><p className="design-label">Before you begin</p><h2 id="questions-heading">A few things<br />worth knowing.</h2><Link className="site-text-link" href="/contact">Have another question? Get in touch <span aria-hidden="true">↗</span></Link></div>
            <div className="question-list">
              <details open><summary>Is the business health check free?</summary><p>Yes. You can answer the questions and see your report without creating an account or making a payment.</p></details>
              <details><summary>What happens after I get my report?</summary><p>You can review your strengths and priorities, or create an account to bring the report into a business workspace. Workspace tools are available through subscription plans. You review a plan and its price before paying.</p></details>
              <details><summary>Do I need financial statements?</summary><p>The assessment asks about your everyday business practices. You choose how consistently each practice is in place, from “Not in place” to “Consistently.”</p></details>
              <details><summary>What does the health score mean?</summary><p>It summarizes the practices you report. Use it to choose improvements and discuss priorities with your team. The score is based on your answers, rather than an audit of your records.</p></details>
            </div>
          </div>
        </section>

        <section className="home-close"><div className="site-width home-close-inner"><div><p className="design-label"><span className="label-dot" /> Your next step starts here</p><h2>A little clarity.<br /><em>A way forward.</em></h2><p>Take five minutes for the business you’re building.</p></div><div className="closing-action"><Link className="site-button site-button-accent" href="/assessment">Start my free health check <Icon name="chevron-right" size={17} /></Link><p>No account or payment needed.</p></div></div></section>
      </main>
    </MarketingPageShell>
  );
}
