/* eslint-disable @next/next/no-img-element -- Shared package and tiny static brand assets do not depend on Next Image. */
import { cn } from "./utils";

export function BrandMark({ className }: { readonly className?: string }) {
  return <span aria-hidden="true" className={cn("grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#f6f3ee] shadow-sm", className)}><img alt="" className="h-full w-full object-contain" src="/brand/negosyoos-mark.png" /></span>;
}

export function Brand({ className, compact = false }: { readonly className?: string; readonly compact?: boolean }) {
  return compact
    ? <BrandMark {...(className ? { className } : {})} />
    : <span className={cn("inline-flex items-center", className)}><img alt="negosyoOS" className="h-10 w-auto max-w-36 object-contain" src="/brand/negosyoos-logo.png" /></span>;
}
