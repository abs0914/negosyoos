import { describe, expect, it } from "vitest";

import { COACH_PLAYBOOKS, resolveCoachCopy, selectCoachPlaybook } from "./index";

describe("Negosyo Coach playbooks", () => {
  it("guides retailers through stock setup before their first checkout", () => {
    const tasks = selectCoachPlaybook("retail-store-os").mission.tasks;
    const stock = tasks.findIndex((task) => task.resource === "stock_received");
    expect(stock).toBeGreaterThan(tasks.findIndex((task) => task.resource === "product"));
    expect(stock).toBeLessThan(tasks.findIndex((task) => task.resource === "completed_sale"));
    expect(tasks[stock]?.requiredModule).toBe("inventory");
  });
  it("selects an installed Business OS playbook and falls back safely", () => {
    expect(selectCoachPlaybook("service-business-os").key).toBe("service_activation");
    expect(selectCoachPlaybook("food-restaurant-os").key).toBe("food_activation");
    expect(selectCoachPlaybook(null).key).toBe("retail_activation");
  });

  it("keeps every activation mission short", () => {
    expect(COACH_PLAYBOOKS.every((playbook) => playbook.mission.tasks.length >= 3 && playbook.mission.tasks.length <= 7)).toBe(true);
  });

  it("resolves configured business terminology", () => {
    expect(resolveCoachCopy("Create {jobOrderSingular}", { jobOrderSingular: "Laundry Order" })).toBe("Create Laundry Order");
  });
});
