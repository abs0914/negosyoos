import Link from "next/link";

import { Brand } from "@negosyo-os/ui";

const groups = [
  { title: "Product", links: [["Free assessment", "/assessment"], ["Sign in", "/login"], ["Create account", "/signup"]] },
  { title: "Company", links: [["About", "/about"], ["Contact us", "/contact"]] },
  { title: "Legal", links: [["Privacy policy", "/privacy"], ["Terms and conditions", "/terms"]] },
] as const;

export function MarketingFooter() {
  return <footer className="border-t bg-card">
    <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
      <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_repeat(3,1fr)]">
        <div><Link aria-label="negosyoOS home" className="inline-flex" href="/"><Brand /></Link><p className="mt-4 max-w-xs text-sm leading-6 text-muted-foreground">A practical Business OS helping Philippine SMEs bring sales, inventory, customers, cash flow, and daily work into one clearer system.</p></div>
        {groups.map((group) => <nav aria-label={group.title} key={group.title}><p className="text-xs font-black uppercase tracking-[.14em] text-foreground">{group.title}</p><ul className="mt-4 space-y-3">{group.links.map(([label, href]) => <li key={href}><Link className="text-sm font-medium text-muted-foreground transition hover:text-primary" href={href}>{label}</Link></li>)}</ul></nav>)}
      </div>
      <div className="mt-10 flex flex-col gap-3 border-t pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} negosyoOS. All rights reserved.</p>
        <p>Powered by <a className="font-bold text-primary hover:underline" href="https://philvirtualoffice.com/" rel="noopener noreferrer" target="_blank">PhilVirtualOffice Business Support Services</a></p>
      </div>
    </div>
  </footer>;
}
