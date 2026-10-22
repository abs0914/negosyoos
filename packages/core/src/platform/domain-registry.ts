export const PLATFORM_LAYERS = [
  "Core Platform",
  "Reusable Modules",
  "Industry OS Templates",
  "Configuration Engine",
  "AI Builder",
  "AI Business Advisor",
] as const;

export type PlatformLayer = (typeof PLATFORM_LAYERS)[number];

export const PLATFORM_DOMAINS = [
  {
    name: "identity",
    owns: ["profiles", "authentication lifecycle"],
    dependsOn: [] as const,
  },
  {
    name: "tenancy",
    owns: ["organizations", "branches", "memberships"],
    dependsOn: ["identity"] as const,
  },
  {
    name: "access-control",
    owns: ["roles", "permissions", "role assignments"],
    dependsOn: ["identity", "tenancy"] as const,
  },
  {
    name: "module-catalog",
    owns: ["reusable module definitions", "organization module enablement"],
    dependsOn: ["tenancy"] as const,
  },
  {
    name: "template-catalog",
    owns: ["Business OS templates", "template module composition"],
    dependsOn: ["module-catalog"] as const,
  },
  {
    name: "configuration-engine",
    owns: ["objects", "fields", "relationships", "views", "forms", "validated change sets"],
    dependsOn: ["tenancy", "module-catalog", "template-catalog"] as const,
  },
  {
    name: "automation",
    owns: ["workflow definitions"],
    dependsOn: ["configuration-engine"] as const,
  },
  {
    name: "insights",
    owns: ["report definitions", "dashboard definitions"],
    dependsOn: ["configuration-engine"] as const,
  },
  {
    name: "ai-builder",
    owns: ["configuration proposals", "proposal explanations"],
    dependsOn: ["configuration-engine"] as const,
  },
  {
    name: "business-advisor",
    owns: ["evidence-backed operational recommendations"],
    dependsOn: ["ai-builder", "insights"] as const,
  },
  {
    name: "billing",
    owns: ["subscriptions", "entitlements"],
    dependsOn: ["tenancy"] as const,
  },
] as const;

export type PlatformDomainName = (typeof PLATFORM_DOMAINS)[number]["name"];
