import type { Metadata } from "next";
import Link from "next/link";
import { Brand, Icon } from "@negosyo-os/ui";

import { AssessmentWizard } from "./assessment-wizard";

export const metadata:Metadata={title:"Free Business Health Assessment",description:"Score your Philippine SME across sales, cashflow, inventory, customers, operations, and digital readiness in about five minutes."};
export default function AssessmentPage(){return <div className="min-h-screen bg-[radial-gradient(65%_35%_at_50%_0%,var(--primary-soft),transparent)]"><header className="border-b bg-card/90 backdrop-blur"><div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5"><Link aria-label="negosyoOS home" href="/"><Brand/></Link><span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1.5 text-[10px] font-bold text-primary sm:text-xs"><Icon name="shield" size={13}/>Private · practical · free</span></div></header><AssessmentWizard/></div>}
