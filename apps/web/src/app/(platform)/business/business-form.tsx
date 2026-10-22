"use client";

import { useActionState, useRef } from "react";

import type { Business } from "@negosyo-os/business";
import { Button } from "@negosyo-os/ui";
import {
  createBusinessAction,
  updateBusinessAction,
  type BusinessActionState,
} from "./actions";

const initialState: BusinessActionState = {};
const inputClass = "h-11 w-full rounded-lg border border-border bg-background px-3 outline-none focus:ring-2 focus:ring-ring";

export function BusinessForm({ business }: { business?: Business | undefined }) {
  const assessmentRef=useRef<HTMLInputElement>(null);
  const action = business
    ? updateBusinessAction.bind(null, business.id)
    : createBusinessAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  const fields = [
    { name: "legalName", label: "Legal name", value: business?.legalName },
    { name: "tradeName", label: "Trade name", value: business?.tradeName },
    { name: "industry", label: "Industry key", value: business?.industry, placeholder: "retail" },
    { name: "phone", label: "Phone", value: business?.phone ?? "", placeholder: "+639171234567" },
    { name: "email", label: "Business email", value: business?.email ?? "", type: "email" },
    { name: "addressLine1", label: "Address line 1", value: business?.address.line1 },
    { name: "addressLine2", label: "Address line 2", value: business?.address.line2 ?? "", required: false },
    { name: "barangay", label: "Barangay", value: business?.address.barangay ?? "", required: false },
    { name: "city", label: "City / municipality", value: business?.address.city },
    { name: "province", label: "Province", value: business?.address.province },
    { name: "postalCode", label: "Postal code", value: business?.address.postalCode ?? "", required: false },
    { name: "tin", label: "TIN (optional)", value: business?.taxIdentifiers.tin ?? "", required: false },
    { name: "registrationNumber", label: "Registration number (optional)", value: business?.taxIdentifiers.registrationNumber ?? "", required: false },
  ] as const;

  return (
    <form action={formAction} className="space-y-6" onSubmit={()=>{if(assessmentRef.current)assessmentRef.current.value=localStorage.getItem("negosyo_business_health_assessment_v1")??"";}}>
      {!business?<input name="healthAssessment" ref={assessmentRef} type="hidden"/>:null}
      <div className="grid gap-5 sm:grid-cols-2">
        {fields.map((field) => (
          <div className="space-y-2" key={field.name}>
            <label className="text-sm font-medium" htmlFor={field.name}>{field.label}</label>
            <input
              aria-describedby={state.fieldErrors?.[field.name]?.length ? `${field.name}-error` : undefined}
              aria-invalid={state.fieldErrors?.[field.name]?.length ? true : undefined}
              className={`${inputClass} ${state.fieldErrors?.[field.name]?.length ? "border-destructive focus:ring-destructive" : ""}`}
              defaultValue={field.value}
              id={field.name}
              name={field.name}
              placeholder={"placeholder" in field ? field.placeholder : undefined}
              required={"required" in field ? field.required : true}
              type={"type" in field ? field.type : "text"}
            />
            {state.fieldErrors?.[field.name]?.length ? (
              <p className="text-sm text-destructive" id={`${field.name}-error`}>{state.fieldErrors[field.name]?.join(" ")}</p>
            ) : null}
          </div>
        ))}
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="businessType">Business type</label>
          <select
            aria-describedby={state.fieldErrors?.businessType?.length ? "businessType-error" : undefined}
            aria-invalid={state.fieldErrors?.businessType?.length ? true : undefined}
            className={`${inputClass} ${state.fieldErrors?.businessType?.length ? "border-destructive focus:ring-destructive" : ""}`}
            defaultValue={business?.businessType ?? "sole_proprietorship"}
            id="businessType"
            name="businessType"
          >
            <option value="sole_proprietorship">Sole proprietorship</option>
            <option value="partnership">Partnership</option>
            <option value="corporation">Corporation</option>
            <option value="cooperative">Cooperative</option>
            <option value="other">Other</option>
          </select>
          {state.fieldErrors?.businessType?.length ? (
            <p className="text-sm text-destructive" id="businessType-error">{state.fieldErrors.businessType.join(" ")}</p>
          ) : null}
        </div>
        {business ? (
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="status">Status</label>
            <select className={inputClass} defaultValue={business.status} id="status" name="status">
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        ) : null}
      </div>
      <p className="text-sm text-muted-foreground">Country, currency, and timezone default to Philippines, PHP, and Asia/Manila.</p>
      {state.message ? <p className={state.status === "success" ? "text-sm text-primary" : "text-sm text-destructive"} role="status">{state.message}</p> : null}
      <Button disabled={pending} type="submit">{pending ? "Saving…" : business ? "Save business" : "Create business"}</Button>
    </form>
  );
}
