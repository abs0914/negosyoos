import Link from "next/link";

import { Brand } from "@negosyo-os/ui";

import { MarketingFooter } from "./marketing-footer";

export function MarketingPageShell({ children, home = false }: { readonly children: React.ReactNode; readonly home?: boolean }) {
  return (
    <div className={home ? "homepage-shell min-h-screen" : "min-h-screen"}>
      {home ? <a className="home-skip-link" href="#main-content">Skip to content</a> : null}
      <header className="site-header">
        <div className="site-width site-header-inner">
          <Link aria-label="negosyoOS home" href="/"><Brand /></Link>
          {home ? (
            <nav aria-label="Main navigation" className="site-nav">
              <a href="#manage">What you can manage</a>
              <a href="#product-preview">Product tour</a>
              <a href="#how-it-works">How it works</a>
            </nav>
          ) : null}
          <div className="site-header-actions">
            <Link className="site-text-link" href="/login">Sign in</Link>
            <Link className="site-button" href="/assessment">Free assessment</Link>
          </div>
        </div>
      </header>
      {home ? <nav className="mobile-section-nav" aria-label="Homepage sections"><a href="#how-it-works">Your report</a><a href="#product-preview">Try the workflow</a><a href="#manage">Explore tools</a></nav> : null}
      {children}
      <MarketingFooter />
    </div>
  );
}

export function ContentPage({ eyebrow, title, intro, children }: { readonly eyebrow: string; readonly title: string; readonly intro: string; readonly children: React.ReactNode }) {
  return <MarketingPageShell><main className="site-width content-page"><header><p className="design-label">{eyebrow}</p><h1>{title}</h1><p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">{intro}</p></header><div className="mt-12 space-y-10 text-[15px] leading-7 text-muted-foreground [&_a]:font-semibold [&_a]:text-primary [&_a]:underline-offset-4 hover:[&_a]:underline [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_p+p]:mt-3">{children}</div></main></MarketingPageShell>;
}
