import { can, requireAuthenticatedUser } from "@negosyo-os/auth";
import { getBusiness, getBusinessLogoUrl, getBusinessSettings, getBusinessTrialDashboard } from "@negosyo-os/business/server";
import { requireTenantContext } from "@negosyo-os/business/tenant-context";
import { PERMISSIONS } from "@negosyo-os/core/permissions";
import { buildModuleNavigation } from "@negosyo-os/modules";
import { listModuleRegistry } from "@negosyo-os/modules/server";
import { getUnreadNotificationCount } from "@negosyo-os/notifications/server";
import { getNegosyoCoach } from "@negosyo-os/onboarding/server";

import {
  BusinessShell,
  type BusinessShellNavGroup,
  type BusinessShellNavItem,
} from "./business-shell";
import { NegosyoCoachPrompt } from "./negosyo-coach";

export default async function BusinessLayout({
  children,
  params,
}: Readonly<{ children: React.ReactNode; params: Promise<{ businessId: string }> }>) {
  const { businessId } = await params;
  await requireTenantContext(businessId);
  const [business, settings, user, trial, coach] = await Promise.all([getBusiness(businessId), getBusinessSettings(businessId), requireAuthenticatedUser(), getBusinessTrialDashboard(businessId), getNegosyoCoach(businessId)]);
  const businessLogoUrl = await getBusinessLogoUrl(businessId, business.logo);
  const [showRoleManagement, showModules, showTemplates, showMetadata, manageMetadata, showRecords, createRecords, updateRecords, showWorkflows, manageWorkflows, showApprovals, decideApprovals, manageApprovals, showAiBuilder,showBilling,showNotifications,showAudit] = await Promise.all([
    can(user, PERMISSIONS.usersManage, { businessId }),
    can(user, PERMISSIONS.moduleRead, { businessId }),
    can(user, PERMISSIONS.templateApply, { businessId }),
    can(user, PERMISSIONS.metadataRead, { businessId }),
    can(user, PERMISSIONS.metadataManage, { businessId }),
    can(user, PERMISSIONS.recordRead, { businessId }),
    can(user, PERMISSIONS.recordCreate, { businessId }),
    can(user, PERMISSIONS.recordUpdate, { businessId }),
    can(user, PERMISSIONS.workflowRead, { businessId }),
    can(user, PERMISSIONS.workflowManage, { businessId }),
    can(user, PERMISSIONS.approvalRead, { businessId }),
    can(user, PERMISSIONS.approvalDecide, { businessId }),
    can(user, PERMISSIONS.approvalManage, { businessId }),
    can(user, PERMISSIONS.aiRead, { businessId }),
    can(user, PERMISSIONS.subscriptionRead, { businessId }),
    can(user, PERMISSIONS.notificationRead, { businessId }),
    can(user, PERMISSIONS.auditRead, { businessId }),
  ]);
  const unreadNotifications=showNotifications?await getUnreadNotificationCount(businessId):0;
  const moduleNavigation = showModules
    ? buildModuleNavigation(businessId, await listModuleRegistry(businessId))
    : [];
  const base = `/business/${business.id}`;
  const primaryItems: BusinessShellNavItem[] = [
    { href: base, icon: "home", label: "Home" },
    ...(coach ? [{ href: `${base}/coach`, icon: "coach", label: "Negosyo Coach", badge: `${coach.completedCount}/${coach.totalCount}` }] : []),
    ...(showNotifications ? [{
      ...(unreadNotifications ? { badge: unreadNotifications > 99 ? "99+" : String(unreadNotifications) } : {}),
      href: `${base}/notifications`,
      icon: "notifications",
      label: "Notifications",
    }] : []),
    { href: `${base}/trial`, icon: "activity", label: "Trial progress" },
  ];
  const groups: BusinessShellNavGroup[] = [
    {
      label: "Daily operations",
      items: moduleNavigation.map((item) => ({ href: item.href, icon: item.icon, label: item.label })),
    },
    {
      label: "Insights & guidance",
      items: showAiBuilder ? [
        { href: `${base}/advisor`, icon: "coach", label: "Business Advisor" },
        { href: `${base}/recommendations`, icon: "wand", label: "Recommendations" },
        { href: `${base}/assessment`, icon: "activity", label: "Business Health" },
        { href: `${base}/ai-interview`, icon: "business", label: "Business Interview" },
      ] : [],
    },
    {
      label: "Build & automate",
      items: [
        ...(showWorkflows || manageWorkflows ? [{ href: `${base}/workflows`, icon: "workflow", label: "Workflows" }] : []),
        ...(showApprovals || decideApprovals || manageApprovals ? [{ href: `${base}/approvals`, icon: "approvals", label: "Approvals" }] : []),
        ...(showAiBuilder ? [{ href: `${base}/system-builder`, icon: "wand", label: "System Builder" }] : []),
        ...(showMetadata ? [{ href: `${base}/configuration-history`, icon: "activity", label: "Configuration History" }] : []),
      ],
    },
    {
      label: "Administration",
      items: [
        ...(showTemplates ? [{ href: `${base}/templates`, icon: "business", label: "Business OS" }] : []),
        ...(showModules ? [{ href: `${base}/modules`, icon: "modules", label: "Modules" }] : []),
        ...(showMetadata || manageMetadata || showRecords || createRecords || updateRecords ? [{ href: `${base}/objects`, icon: "objects", label: "Objects & fields" }] : []),
        { href: `${base}/branches`, icon: "branches", label: "Branches" },
        ...(showRoleManagement ? [{ href: `${base}/roles`, icon: "team", label: "Team & roles" }] : []),
        ...(showAudit ? [{ href: `${base}/audit`, icon: "shield", label: "Audit log" }] : []),
        ...(showBilling ? [{ href: `${base}/billing`, icon: "subscription", label: "Billing" }] : []),
        { href: `${base}/settings`, icon: "settings", label: "Settings" },
      ],
    },
  ];
  const trialNotice = trial.trialStatus === "active" || trial.trialStatus === "expiring"
    ? { daysRemaining: trial.daysRemaining ?? 0, href: `${base}/trial` }
    : undefined;

  return <BusinessShell
    base={base}
    businessName={business.tradeName}
    businessLogoUrl={businessLogoUrl}
    groups={groups}
    primaryItems={primaryItems}
    trial={trialNotice}
    theme={{ primary: settings.primaryColor, secondary: settings.secondaryColor, accent: settings.accentColor }}
  >
    {children}
    {coach ? <NegosyoCoachPrompt businessId={businessId} coach={coach} /> : null}
  </BusinessShell>;
}
