import Link from "next/link";
import { createApprovalAction } from "@/app/(platform)/business/approval-actions";
import { ApprovalRequestForm } from "@/app/(platform)/business/approval-request-form";
export default async function NewApprovalPage({params}:{params:Promise<{businessId:string}>}) { const {businessId}=await params; return <main className="mx-auto w-full max-w-3xl px-6 py-12"><Link className="text-sm font-medium text-primary hover:underline" href={`/business/${businessId}/approvals`}>← Approvals</Link><h1 className="mt-5 text-3xl font-semibold">New approval request</h1><p className="mt-2 text-muted-foreground">Route a decision to one user, one role, or a sequence of approvers.</p><ApprovalRequestForm action={createApprovalAction.bind(null,businessId)} /></main>; }
