import { PERMISSIONS, type Permission } from "@negosyo-os/core/permissions";
import { z } from "zod";

const permissions = Object.values(PERMISSIONS) as [Permission, ...Permission[]];

export const CoachResourceSchema = z.enum([
  "business_os_installation",
  "product",
  "service",
  "customer",
  "job_order",
  "completed_job_order",
  "appointment",
  "completed_sale",
  "stock_received",
]);

export const CoachTaskDefinitionSchema = z.strictObject({
  key: z.string().regex(/^[a-z][a-z0-9_]{0,79}$/),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(500),
  reason: z.string().trim().min(1).max(500),
  actionLabel: z.string().trim().min(1).max(80),
  href: z.string().startsWith("/"),
  resource: CoachResourceSchema,
  permission: z.enum(permissions),
  requiredModule: z.string().regex(/^[a-z][a-z0-9_]{0,79}$/).nullable(),
});

export const CoachMissionDefinitionSchema = z.strictObject({
  key: z.string().regex(/^[a-z][a-z0-9_]{0,79}$/),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(500),
  tasks: z.array(CoachTaskDefinitionSchema).min(1).max(7),
});

export const CoachPlaybookDefinitionSchema = z.strictObject({
  key: z.string().regex(/^[a-z][a-z0-9_]{0,79}$/),
  version: z.number().int().positive(),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(500),
  templateKeys: z.array(z.string()).min(1),
  mission: CoachMissionDefinitionSchema,
});

export type CoachResource = z.infer<typeof CoachResourceSchema>;
export type CoachTaskDefinition = z.infer<typeof CoachTaskDefinitionSchema>;
export type CoachPlaybookDefinition = z.infer<typeof CoachPlaybookDefinitionSchema>;

export interface NegosyoCoachTask extends CoachTaskDefinition {
  readonly status: "completed" | "current" | "upcoming";
}

export interface NegosyoCoach {
  readonly playbookKey: string;
  readonly title: string;
  readonly description: string;
  readonly missionTitle: string;
  readonly missionDescription: string;
  readonly tasks: readonly NegosyoCoachTask[];
  readonly completedCount: number;
  readonly totalCount: number;
  readonly percentComplete: number;
  readonly dismissed: boolean;
  readonly currentTask: NegosyoCoachTask | null;
}

const installTask = {
  key: "activate_business_os",
  title: "Activate your recommended Business OS",
  description: "Apply the modules and terminology recommended for this business.",
  reason: "This gives the coach the right tools and steps for how your business operates.",
  actionLabel: "Review recommendation",
  href: "/templates",
  resource: "business_os_installation",
  permission: PERMISSIONS.templateApply,
  requiredModule: null,
} as const;

const playbooks = CoachPlaybookDefinitionSchema.array().parse([
  {
    key: "service_activation",
    version: 1,
    title: "Set up your service operations",
    description: "Complete one real customer job from setup to finished work.",
    templateKeys: ["service-business-os"],
    mission: {
      key: "first_service_cycle",
      title: "Complete your first service cycle",
      description: "Add what you sell, add a customer, then track one job through completion.",
      tasks: [
        installTask,
        { key: "add_service", title: "Add your first service", description: "Enter a service and its selling price.", reason: "A clean service list makes orders faster and pricing consistent.", actionLabel: "Add service", href: "/catalog/new?type=service", resource: "service", permission: PERMISSIONS.catalogManage, requiredModule: "product_catalog" },
        { key: "add_customer", title: "Add your first customer", description: "Save the customer name and mobile number.", reason: "Customer history connects visits, payments, loyalty, and follow-ups.", actionLabel: "Add customer", href: "/customers/new", resource: "customer", permission: PERMISSIONS.crmManage, requiredModule: "crm" },
        { key: "create_job_order", title: "Create your first {jobOrderSingular}", description: "Record the customer request, service, due date, and assigned staff.", reason: "This becomes the shared source of truth for work in progress.", actionLabel: "Create {jobOrderSingular}", href: "/job-orders/new", resource: "job_order", permission: PERMISSIONS.jobOrdersManage, requiredModule: "job_orders" },
        { key: "complete_job_order", title: "Finish your first {jobOrderSingular}", description: "Move the work to completed or released when it is done.", reason: "Completing real work unlocks useful operational history and owner insights.", actionLabel: "Open {jobOrderPlural}", href: "/job-orders", resource: "completed_job_order", permission: PERMISSIONS.jobOrdersStatus, requiredModule: "job_orders" },
      ],
    },
  },
  {
    key: "food_activation",
    version: 1,
    title: "Set up your restaurant operations",
    description: "Build a small working menu and record the first real transaction.",
    templateKeys: ["food-restaurant-os"],
    mission: {
      key: "first_food_sale",
      title: "Record your first menu sale",
      description: "Add a menu item and customer, then complete a sale.",
      tasks: [
        installTask,
        { key: "add_menu_item", title: "Add your first menu item", description: "Enter an item, selling price, and unit.", reason: "Your menu powers faster sales and reliable item reporting.", actionLabel: "Add menu item", href: "/catalog/new", resource: "product", permission: PERMISSIONS.catalogManage, requiredModule: "product_catalog" },
        { key: "add_customer", title: "Add your first customer", description: "Save a customer name and mobile number.", reason: "Customer history helps identify regulars without slowing down counter service.", actionLabel: "Add customer", href: "/customers/new", resource: "customer", permission: PERMISSIONS.crmManage, requiredModule: "crm" },
        { key: "complete_sale", title: "Complete your first sale", description: "Add an item, accept payment, and issue the receipt.", reason: "Your first real sale activates sales, product, and customer insights.", actionLabel: "Open POS", href: "/pos", resource: "completed_sale", permission: PERMISSIONS.salesCreate, requiredModule: "pos" },
      ],
    },
  },
  {
    key: "retail_activation",
    version: 2,
    title: "Set up your store operations",
    description: "Add the basics and complete the first real counter sale.",
    templateKeys: ["retail-store-os", "fallback"],
    mission: {
      key: "first_retail_sale",
      title: "Complete your first store sale",
      description: "Add or import products, record opening stock, and complete a sale. Then review the results on your dashboard.",
      tasks: [
        installTask,
        { key: "add_product", title: "Add or import your products", description: "Add a product or import your catalog with SKUs, units, costs, and selling prices.", reason: "A good catalog keeps checkout and stock records consistent.", actionLabel: "Open product catalog", href: "/catalog", resource: "product", permission: PERMISSIONS.catalogManage, requiredModule: "product_catalog" },
        { key: "receive_stock", title: "Record your opening stock", description: "Set up the stock location and record an opening balance or purchase for a product you will sell.", reason: "Tracked products need stock before checkout. Entering a product alone does not add stock.", actionLabel: "Set up stock", href: "/inventory", resource: "stock_received", permission: PERMISSIONS.inventoryAdjust, requiredModule: "inventory" },
        { key: "add_customer", title: "Add your first customer", description: "Save a customer name and mobile number.", reason: "Customer history supports credit accounts, follow-ups, and repeat business.", actionLabel: "Add customer", href: "/customers/new", resource: "customer", permission: PERMISSIONS.crmManage, requiredModule: "crm" },
        { key: "complete_sale", title: "Complete your first sale", description: "Scan or select a product, accept payment, and issue the receipt.", reason: "Your first real sale activates sales, inventory, and customer insights.", actionLabel: "Open POS", href: "/pos", resource: "completed_sale", permission: PERMISSIONS.salesCreate, requiredModule: "pos" },
      ],
    },
  },
]);

export function selectCoachPlaybook(templateKey: string | null): CoachPlaybookDefinition {
  return playbooks.find((playbook) => templateKey && playbook.templateKeys.includes(templateKey))
    ?? playbooks.find((playbook) => playbook.templateKeys.includes("fallback"))!;
}

export function resolveCoachCopy(value: string, labels: Readonly<Record<string, string>>): string {
  return value.replace(/\{([a-zA-Z]+)\}/g, (token, key: string) => labels[key] ?? token);
}

export const COACH_PLAYBOOKS: readonly CoachPlaybookDefinition[] = playbooks;
