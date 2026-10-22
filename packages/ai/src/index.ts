import { ConfigurationChangeSetSchema } from "@negosyo-os/configuration";
import { z } from "zod";
export * from "./business-interview";
export * from "./health-assessment";
export * from "./system-builder";

export const AiConfigurationProposalSchema = z.object({
  kind: z.literal("configuration_proposal"),
  changeSet: ConfigurationChangeSetSchema,
  confidence: z.number().min(0).max(1),
  assumptions: z.array(z.string().trim().min(1).max(500)).max(20),
  warnings: z.array(z.string().trim().min(1).max(500)).max(20),
}).strict();

export type AiConfigurationProposal = z.infer<typeof AiConfigurationProposalSchema>;

export interface AiBuilderRequest {
  organizationId: string;
  instruction: string;
  currentConfigurationRevision: number;
  allowedObjectKeys: readonly string[];
  allowedPermissionKeys: readonly string[];
}

/**
 * Provider-neutral proposal boundary. Implementations must return schema-valid
 * configuration and never source code, SQL, migrations, or direct writes.
 */
export interface AiConfigurationBuilder {
  propose(request: AiBuilderRequest): Promise<AiConfigurationProposal>;
}

export { getMetricDefinition, getMetricRegistry } from "@negosyo-os/analytics";
export type { MetricDefinition, MetricKey, MetricQuery, MetricResult } from "@negosyo-os/analytics";
export { AdvisorConversationIdSchema, AdvisorQuestionSchema, AdvisorResponseSchema, AdvisorSectionSchema, composeAdvisorResponse, planAdvisorQuestion } from "./advisor";
export type { AdvisorConversation, AdvisorIntent, AdvisorMessage, AdvisorPlan, AdvisorResponse, AdvisorSection } from "./advisor";
export{RecommendationDraftSchema,RecommendationEvidenceSchema,RecommendationIdSchema,RecommendationPrioritySchema,RecommendationSaveSchema,RecommendationSchema,RecommendationStatusSchema,RecommendationTypeSchema,buildTraceableRecommendations}from"./recommendations";
export type{Recommendation,RecommendationDraft,RecommendationEvidence,RecommendationPriority,RecommendationStatus,RecommendationType}from"./recommendations";
