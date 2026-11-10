import type { Metadata } from "next";
import Link from "next/link";
import { Brand, Icon } from "@negosyo-os/ui";

import { AssessmentWizard } from "./assessment-wizard";

export const metadata: Metadata = {
  title: "Free Business Health Assessment",
  description: "Score your Philippine SME across sales, cash flow, inventory, customers, operations, and digital readiness in about five minutes.",
};

export default function AssessmentPage() {
  return (
    <div className="min-h-screen">
      <header className="site-header">
        <div className="site-width site-header-inner">
          <Link aria-label="negosyoOS home" href="/"><Brand /></Link>
          <span className="design-label"><Icon name="shield" size={15} /> Private · free</span>
        </div>
      </header>
      <AssessmentWizard />
    </div>
  );
}
