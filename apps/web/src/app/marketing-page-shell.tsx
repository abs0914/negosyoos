import Link from "next/link";

import { Brand } from "@negosyo-os/ui";

import { MarketingFooter } from "./marketing-footer";

export function MarketingPageShell({ children }: { readonly children: React.ReactNode }) {
  return <div className="min-h-screen bg-background"><header className="border-b bg-card/90"><div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 lg:px-8"><Link aria-label="negosyoOS home" href="/"><Brand /></Link><div className="flex items-center gap-2"><Link className="min-h-10 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-muted" href="/login">Sign in</Link><Link className="inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary-hover" href="/assessment">Free assessment</Link></div></div></header>{children}<MarketingFooter /></div>;
}

export function ContentPage({ eyebrow, title, intro, children }: { readonly eyebrow: string; readonly title: string; readonly intro: string; readonly children: React.ReactNode }) {
  return <MarketingPageShell><main className="mx-auto w-full max-w-4xl px-5 py-14 sm:py-20 lg:px-8"><p className="text-xs font-black uppercase tracking-[.16em] text-primary">{eyebrow}</p><h1 className="mt-3 text-4xl font-bold tracking-[-.045em] text-balance sm:text-5xl">{title}</h1><p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">{intro}</p><div className="mt-12 space-y-10 text-[15px] leading-7 text-muted-foreground [&_a]:font-semibold [&_a]:text-primary [&_a]:underline-offset-4 hover:[&_a]:underline [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_p+p]:mt-3">{children}</div></main></MarketingPageShell>;
}
