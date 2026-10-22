import Link from "next/link";

import { listCustomerSegments } from "@negosyo-os/crm/server";

import { CustomerSegmentForm } from "../../../customer-segment-form";

export default async function CustomerSegmentsPage({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  const segments = await listCustomerSegments(businessId);
  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6"><Link className="text-sm text-primary hover:underline" href={`/business/${businessId}/customers`}>← Customers</Link><h1 className="mt-4 text-3xl font-semibold">Customer segments</h1><p className="mt-2 text-muted-foreground">Build safe, declarative audiences from customer metrics. Segment rules never execute arbitrary code.</p><div className="mt-6"><CustomerSegmentForm businessId={businessId} /></div><section className="mt-6 grid gap-3 md:grid-cols-2">{segments.map((segment) => <article className="rounded-xl border bg-card p-4" key={segment.id}><div className="flex justify-between gap-4"><div><h2 className="font-semibold">{segment.name}</h2><p className="text-xs text-muted-foreground">{segment.key}</p></div><strong className="text-2xl">{segment.customerCount ?? 0}</strong></div><p className="mt-3 text-sm text-muted-foreground">{segment.description || "No description"}</p><pre className="mt-3 overflow-auto rounded-lg bg-muted p-3 text-xs">{JSON.stringify(segment.criteria, null, 2)}</pre></article>)}{!segments.length ? <p className="text-sm text-muted-foreground">Create a segment to organize customers by behavior.</p> : null}</section></main>;
}
