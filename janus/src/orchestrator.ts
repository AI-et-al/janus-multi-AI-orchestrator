import { codexPlan } from './providers/codexPlanner';
import { claudePlan } from './providers/claudePlanner';
import { JanusOutput } from './types';

/**
 * Extracts the SYSTEM PROMPT section from a planner's output.
 * Looks for explicit markers like "SYSTEM PROMPT:" or similar patterns.
 */
function extractSystemPrompt(content: string): string {
  // Try to find explicit section markers
  const systemPromptMatch = content.match(
    /(?:^|\n)(?:SYSTEM PROMPT|System Prompt|SYSTEM|System):\s*\n?(.+?)(?:\n\n|\n(?:PLAN|Plan|RATIONALE|Rationale):|$)/is
  );
  if (systemPromptMatch) {
    return systemPromptMatch[1].trim();
  }

  // If no explicit marker, try to extract first paragraph or first few lines
  const lines = content.split('\n').filter((l) => l.trim());
  if (lines.length > 0) {
    // Take first paragraph or first 3 lines, whichever is shorter
    const firstParagraph = lines[0];
    if (firstParagraph.length > 200) {
      return firstParagraph.substring(0, 200).trim() + '...';
    }
    return lines.slice(0, 3).join(' ').trim();
  }

  return content.trim();
}

/**
 * Extracts the PLAN section from a planner's output.
 */
function extractPlan(content: string): string {
  const planMatch = content.match(
    /(?:^|\n)(?:PLAN|Plan|IMPLEMENTATION PLAN|Implementation Plan):\s*\n?(.+?)(?:\n\n|\n(?:RATIONALE|Rationale|SYSTEM|System):|$)/is
  );
  if (planMatch) {
    return planMatch[1].trim();
  }
  return '';
}

/**
 * Extracts the RATIONALE section from a planner's output.
 */
function extractRationale(content: string): string {
  const rationaleMatch = content.match(
    /(?:^|\n)(?:RATIONALE|Rationale|REASONING|Reasoning):\s*\n?(.+?)$/is
  );
  if (rationaleMatch) {
    return rationaleMatch[1].trim();
  }
  return '';
}

/**
 * Merges Codex and Claude outputs into a clean, minimal system prompt.
 * The merged prompt should be suitable for downstream agents.
 */
function mergeSystemPrompts(
  task: string,
  codexPrompt: string,
  claudePrompt: string
): string {
  // Extract core system prompts from both
  const codexCore = extractSystemPrompt(codexPrompt);
  const claudeCore = extractSystemPrompt(claudePrompt);

  // Build merged prompt: combine the best of both, prioritizing clarity
  const parts: string[] = [];

  // Start with task context
  parts.push(`Task: ${task}`);

  // Add Codex's structured approach (usually more implementation-focused)
  if (codexCore) {
    parts.push(`\nApproach: ${codexCore}`);
  }

  // Add Claude's refinements (usually more safety/alignment-focused)
  if (claudeCore && claudeCore !== codexCore) {
    // Only add if it adds value beyond Codex's prompt
    const claudeRefinements = claudeCore
      .split('\n')
      .filter((line) => {
        const trimmed = line.trim().toLowerCase();
        return (
          trimmed.includes('consider') ||
          trimmed.includes('ensure') ||
          trimmed.includes('avoid') ||
          trimmed.includes('note')
        );
      })
      .join('; ');

    if (claudeRefinements) {
      parts.push(`\nConsiderations: ${claudeRefinements}`);
    }
  }

  // If merging didn't produce much, fall back to a simple combination
  if (parts.length <= 1) {
    return `${task}\n\n${codexCore || 'Execute the task with precision and clarity.'}`;
  }

  return parts.join('');
}

/**
 * Main orchestrator function: calls both planners and merges their outputs.
 */
export async function planWithJanus(task: string): Promise<JanusOutput> {
  const [codex, claude] = await Promise.all([
    codexPlan(task),
    claudePlan(task)
  ]);

  // Extract structured sections
  const codexSystemPrompt = extractSystemPrompt(codex.systemPrompt);
  const codexPlanText = extractPlan(codex.systemPrompt) || codex.plan;
  const codexRationale = extractRationale(codex.systemPrompt) || codex.rationale;

  const claudeSystemPrompt = extractSystemPrompt(claude.systemPrompt);
  const claudePlanText = extractPlan(claude.systemPrompt) || claude.plan;
  const claudeRationale = extractRationale(claude.systemPrompt) || claude.rationale;

  // Build merged system prompt (clean and minimal for downstream agents)
  const mergedPrompt = mergeSystemPrompts(
    task,
    codexSystemPrompt,
    claudeSystemPrompt
  );

  // Build reference notes (preserve all raw outputs)
  const mergedNotes = [
    '# Codex Proposal',
    '',
    '## System Prompt',
    codexSystemPrompt,
    '',
    '## Plan',
    codexPlanText || '(see rationale)',
    '',
    '## Rationale',
    codexRationale || codex.rationale,
    '',
    '---',
    '',
    '# Claude Proposal',
    '',
    '## System Prompt',
    claudeSystemPrompt,
    '',
    '## Plan',
    claudePlanText || '(see rationale)',
    '',
    '## Rationale',
    claudeRationale || claude.rationale
  ]
    .filter((line) => line !== '')
    .join('\n');

  return {
    codex,
    claude,
    mergedPrompt,
    mergedNotes
  };
}
