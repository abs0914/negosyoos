import Link from "next/link";

import { recommendBusinessOSTemplate } from "@negosyo-os/ai";
import {
  listBusinessHealthAssessments,
  listBusinessInterviews,
} from "@negosyo-os/ai/server";
import { can, requireAuthenticatedUser } from "@negosyo-os/auth";
import { getBusiness } from "@negosyo-os/business/server";
import { PERMISSIONS } from "@negosyo-os/core/permissions";
import { listBusinessOSTemplates } from "@negosyo-os/templates/server";

export default async function TemplateRegistryPage({ params }: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const [templates, business, user] = await Promise.all([
    listBusinessOSTemplates(businessId),
    getBusiness(businessId),
    requireAuthenticatedUser(),
  ]);
  const canReadAi = await can(user, PERMISSIONS.aiRead, { businessId });
  const [assessments, interviews] = canReadAi
    ? await Promise.all([
      listBusinessHealthAssessments(businessId),
      listBusinessInterviews(businessId),
    ])
    : [[], []] as const;
  const interview = interviews.find((item) => item.recommendation && item.status !== "rejected");
  const assessment = assessments[0];
  const baseline = recommendBusinessOSTemplate(
    interview?.profile.industry ?? assessment?.industry ?? business.industry,
  );
  const recommendedKey = interview?.recommendation?.recommendedBusinessOS.templateKey ?? baseline.templateKey;
  const recommended = templates.find((template) => template.key === recommendedKey);
  const installed = templates.find((template) => template.installation);
  const recommendationReason = interview?.recommendation?.recommendedBusinessOS.reason ??
    (assessment
      ? `Your ${assessment.industry.replaceAll("_", " ")} assessment points to a service-focused operating model. Its priority areas—${assessment.priorities.slice(0, 3).join(", ")}—will also inform the deeper AI Business Interview.`
      : `This is the closest match for the ${business.industry.replaceAll("-", " ")} industry selected for ${business.tradeName}.`);
  const recommendationSource = interview
    ? "AI Business Interview"
    : assessment
      ? "Business Health Assessment"
      : "Business industry";
  const orderedTemplates = [...templates].sort((left, right) =>
    Number(right.key === recommendedKey) - Number(left.key === recommendedKey));

  return <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <header>
      <p className="text-sm font-semibold text-primary">Business OS</p>
      <h1 className="text-3xl font-semibold">Your recommended operating system</h1>
      <p className="mt-2 max-w-3xl text-muted-foreground">Your questionnaire guides the recommendation. You review the configuration before installation because NegosyoOS never applies questionnaire or AI changes without your approval.</p>
    </header>

    {recommended ? <section className="mt-7 overflow-hidden rounded-3xl border border-primary/30 bg-primary/5">
      <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-primary">Recommended from your {recommendationSource}</p>
          <h2 className="mt-2 text-2xl font-semibold">{recommended.name}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{recommendationReason}</p>
          <p className="mt-3 text-xs font-semibold text-muted-foreground">Nothing is installed until you review and approve it.</p>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Link className="inline-grid min-h-11 place-items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground" href={`/business/${businessId}/templates/${recommended.key}`}>Review recommended OS</Link>
          <Link className="inline-grid min-h-11 place-items-center rounded-xl border bg-card px-5 text-sm font-semibold" href={`/business/${businessId}/ai-interview`}>{interview ? "View detailed recommendation" : "Refine with AI interview"}</Link>
        </div>
      </div>
    </section> : null}

    {installed ? <section className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-5">
      <p className="text-sm font-semibold text-primary">Installed Business OS</p>
      <h2 className="mt-1 text-xl font-semibold">{installed.name} · v{installed.installation?.installedVersion}</h2>
      <p className="mt-1 text-sm text-muted-foreground">Updates add new template resources while preserving every existing tenant resource.</p>
    </section> : null}

    <section className="mt-8">
      <div>
        <h2 className="text-xl font-semibold">Compare available foundations</h2>
        <p className="mt-1 text-sm text-muted-foreground">These remain available for comparison; the recommended option appears first.</p>
      </div>
      <div className="mt-4 grid gap-5 md:grid-cols-2">
        {orderedTemplates.map((template) => {
          const isRecommended = template.key === recommendedKey;
          return <Link className={`rounded-2xl border bg-card p-6 hover:border-primary ${isRecommended ? "border-primary ring-2 ring-primary/10" : ""}`} href={`/business/${businessId}/templates/${template.key}`} key={template.id}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{template.industryCode} · {template.icon}</p>
                <h3 className="mt-1 text-xl font-semibold">{template.name}</h3>
              </div>
              <div className="flex flex-col items-end gap-2">
                {isRecommended ? <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">Recommended</span> : null}
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold capitalize">{template.minimumPlan}</span>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{template.description}</p>
            <div className="mt-5 flex justify-between text-xs"><span>Latest v{template.latestVersion.version}</span><span>{template.installation ? `Installed v${template.installation.installedVersion}` : "Preview →"}</span></div>
          </Link>;
        })}
      </div>
    </section>
  </main>;
}
