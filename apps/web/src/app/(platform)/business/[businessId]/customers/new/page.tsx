import Link from "next/link";

import { listBranches } from "@negosyo-os/business/server";

import { CustomerEditor } from "../../../customer-editor";

export default async function NewCustomerPage({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  const branches = await listBranches(businessId);
  return <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6"><Link className="text-sm text-primary hover:underline" href={`/business/${businessId}/customers`}>← Customers</Link><h1 className="mt-4 text-3xl font-semibold">New customer</h1><p className="mt-2 text-muted-foreground">Mobile is the primary contact field and accepts common Philippine formats.</p><CustomerEditor branches={branches} businessId={businessId} /></main>;
}
