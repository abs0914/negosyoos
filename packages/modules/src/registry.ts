import type { ModuleDefinition, ModuleNavigationItem, ModuleRegistryEntry } from "./models";

export function missingDependencies(
  module: ModuleDefinition,
  enabledModuleKeys: ReadonlySet<string>,
): readonly string[] {
  return module.dependencies.filter((dependency) => !enabledModuleKeys.has(dependency)).sort();
}

export function blockingDependents(
  moduleKey: string,
  definitions: readonly ModuleDefinition[],
  enabledModuleKeys: ReadonlySet<string>,
): readonly string[] {
  return definitions
    .filter((definition) => enabledModuleKeys.has(definition.key) && definition.dependencies.includes(moduleKey))
    .map((definition) => definition.key)
    .sort();
}

export function buildModuleNavigation(
  businessId: string,
  registry: readonly ModuleRegistryEntry[],
): readonly ModuleNavigationItem[] {
  return registry
    .filter((entry) => entry.businessModule?.enabled)
    .toSorted((left, right) => navigationLabel(left).localeCompare(navigationLabel(right)))
    .map((entry) => {
      const { definition } = entry;
      return ({
      key: definition.key,
      label: navigationLabel(entry),
      icon: definition.icon,
      href: definition.key === "product_catalog" ? `/business/${businessId}/catalog` : definition.key === "inventory" ? `/business/${businessId}/inventory` : definition.key === "pos" ? `/business/${businessId}/pos` : definition.key === "expenses" ? `/business/${businessId}/expenses` : definition.key === "crm" ? `/business/${businessId}/customers` : definition.key === "quotations" ? `/business/${businessId}/quotations` : definition.key === "invoicing" ? `/business/${businessId}/invoices` : definition.key === "purchasing" ? `/business/${businessId}/purchasing` : definition.key === "appointments" ? `/business/${businessId}/appointments` : definition.key === "job_orders" ? `/business/${businessId}/job-orders` : definition.key === "employees" ? `/business/${businessId}/employees` : definition.key === "attendance" ? `/business/${businessId}/attendance` : definition.key === "delivery" ? `/business/${businessId}/deliveries` : definition.key === "loyalty" ? `/business/${businessId}/loyalty` : `/business/${businessId}/modules/${definition.key}`,
      });
    });
}

function navigationLabel(entry: ModuleRegistryEntry): string {
  const configured = entry.definition.key === "job_orders"
    ? entry.businessModule?.configuration.plural_label
    : undefined;
  return typeof configured === "string" && configured.trim() ? configured.trim() : entry.definition.name;
}
