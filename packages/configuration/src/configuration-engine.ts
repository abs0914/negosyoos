import type { ConfigurationChangeSet, ConfigurationProposalInput } from "./configuration-operation";

export type ConfigurationProposalStatus="validated"|"approved"|"applying"|"applied"|"rejected"|"failed"|"rolling_back"|"rolled_back";
export interface ConfigurationProposal { readonly id:string;readonly businessId:string;readonly baseRevision:number;readonly targetRevision:number;readonly title:string;readonly summary:string;readonly operations:ConfigurationChangeSet["operations"];readonly status:ConfigurationProposalStatus;readonly validationResult:Readonly<Record<string,string>>;readonly warnings:readonly string[];readonly proposedBy:string|null;readonly approvedBy:string|null;readonly appliedAt:string|null;readonly rolledBackAt:string|null;readonly failureReason:string|null;readonly createdAt:string; }
export interface ConfigurationProposalEvent { readonly id:string;readonly event:string;readonly actorId:string;readonly details:Readonly<Record<string,unknown>>;readonly createdAt:string }
export interface ConfigurationPreview { readonly changeSet:ConfigurationChangeSet;readonly resultingRevision:number;readonly warnings:readonly string[];readonly validationResult:Readonly<Record<string,string>> }
export interface ConfigurationApplyResult { readonly proposalId:string;readonly businessId:string;readonly revision:number;readonly appliedAt:string }
export type ConfigurationVersionSource="manual"|"ai"|"template"|"system";
export interface ConfigurationVersion { readonly id:string;readonly businessId:string;readonly version:number;readonly authorId:string;readonly source:ConfigurationVersionSource;readonly changes:Readonly<Record<string,unknown>>;readonly description:string;readonly changeSetId:string|null;readonly restoresVersion:number|null;readonly createdAt:string }
export interface ConfigurationVersionDifference { readonly operation:string;readonly direction:"applied"|"reverted";readonly version:number;readonly source:ConfigurationVersionSource;readonly description:string }
export interface ConfigurationVersionComparison { readonly fromVersion:number;readonly toVersion:number;readonly differences:readonly ConfigurationVersionDifference[] }

export interface ConfigurationEngine {
  preview(businessId:string,input:ConfigurationProposalInput):Promise<ConfigurationPreview>;
  propose(businessId:string,input:ConfigurationProposalInput):Promise<string>;
  review(businessId:string,proposalId:string,decision:"approved"|"rejected"):Promise<void>;
  apply(businessId:string,proposalId:string):Promise<ConfigurationApplyResult>;
  rollback(businessId:string,proposalId:string):Promise<void>;
}
