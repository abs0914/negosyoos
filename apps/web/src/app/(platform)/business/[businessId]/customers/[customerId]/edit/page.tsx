import Link from "next/link";

import { listBranches } from "@negosyo-os/business/server";
import { getCustomerProfile } from "@negosyo-os/crm/server";

import { CustomerEditor } from "../../../../customer-editor";

export default async function EditCustomerPage({ params }: { params: Promise<{ businessId: string; customerId: string }> }) {
  const { businessId, customerId } = await params;
  const [profile, branches] = await Promise.all([getCustomerProfile(businessId, customerId), listBranches(businessId)]);
  return <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6"><Link className="text-sm text-primary hover:underline" href={`/business/${businessId}/customers/${customerId}`}>← Customer profile</Link><h1 className="mt-4 text-3xl font-semibold">Edit {profile.customer.name}</h1><CustomerEditor branches={branches} businessId={businessId} customer={profile.customer} /></main>;
}
