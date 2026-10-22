"use server";

import { revalidatePath } from "next/cache";

import { AppError } from "@negosyo-os/core/errors";
import { logger } from "@negosyo-os/core/logging";
import { SetBusinessModuleStateInputSchema } from "@negosyo-os/modules";
import { setBusinessModuleState } from "@negosyo-os/modules/server";

export interface ModuleActionState {
  status?: "success" | "error";
  message?: string;
}

const moduleLogger = logger.child({ domain: "modules" });

function configurationFromForm(formData: FormData): Record<string, FormDataEntryValue> {
  const configuration: Record<string, FormDataEntryValue> = {};
  const names = new Set([...formData.keys()].filter((key) => key.startsWith("configuration.")));
  for (const name of names) {
    const value = formData.getAll(name).at(-1);
    if (value !== undefined) configuration[name.slice("configuration.".length)] = value;
  }
  return configuration;
}

export async function setBusinessModuleStateAction(
  businessId: string,
  moduleKey: string,
  _previousState: ModuleActionState,
  formData: FormData,
): Promise<ModuleActionState> {
  const enabledValue = formData.getAll("enabled").at(-1);
  const parsed = SetBusinessModuleStateInputSchema.safeParse({
    moduleKey,
    enabled: enabledValue === "true" ? true : enabledValue === "false" ? false : enabledValue,
    configuration: configurationFromForm(formData),
  });
  if (!parsed.success) return { status: "error", message: "Check the module configuration." };

  try {
    await setBusinessModuleState(businessId, parsed.data);
    revalidatePath(`/business/${businessId}`, "layout");
    return {
      status: "success",
      message: parsed.data.enabled ? "Module configuration saved." : "Module deactivated.",
    };
  } catch (error) {
    moduleLogger.error("Business module state change failed", error, { businessId, moduleKey });
    return {
      status: "error",
      message: error instanceof AppError && error.expose
        ? error.message
        : "The module could not be updated.",
    };
  }
}
