export interface PlanResult {
  provider: 'codex' | 'claude';
  systemPrompt: string;
  plan: string;
  rationale: string;
}

export interface JanusOutput {
  codex?: PlanResult;
  claude?: PlanResult;
  mergedPrompt: string;
  mergedNotes: string;
}
