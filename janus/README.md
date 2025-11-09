# Janus: Dual-Flow Orchestrator

Janus is a dual-headed planner that merges Codex and Claude-style perspectives into coherent system prompts for downstream AI agents.

## Purpose

Janus:
- Calls both Codex and Claude-style planners in parallel
- Merges their outputs into a single, minimal system prompt
- Preserves raw outputs as reference notes
- Supports multiple Claude integration modes

## Installation

```bash
npm install
npm run build
```

## Configuration

Create a `.env` file with at least:

```bash
OPENAI_API_KEY=sk-your-key-here
```

### Claude Integration Modes

Janus supports three modes for Claude-style planning (checked in order):

1. **Anthropic API** (if `ANTHROPIC_API_KEY` is set)
   - Uses the official `@anthropic-ai/sdk` package
   - Direct integration with Claude models

2. **External Service** (if `CLAUDE_FLOW_URL` or `CLAUDE_FLOW_CMD` is set)
   - `CLAUDE_FLOW_URL`: HTTP endpoint that accepts POST with `{ task: string }`
   - `CLAUDE_FLOW_CMD`: CLI command that accepts task as argument
   - Useful for custom Claude wrappers or services

3. **OpenAI Fallback** (default)
   - Uses OpenAI to simulate Claude-style critique
   - Good for development and testing

Example `.env`:

```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...  # Optional
# CLAUDE_FLOW_URL=http://localhost:3000/plan  # Optional
# CLAUDE_FLOW_CMD=claude-flow  # Optional
```

## Usage

### CLI

```bash
# Human-readable output
node dist/index.js "Design a multi-AI workflow"

# JSON output (for programmatic use)
node dist/index.js "Your task" --json
```

Or via npm:

```bash
npm start "Your task"
npm start "Your task" --json
```

### Programmatic

```typescript
import { planWithJanus } from './orchestrator';

const output = await planWithJanus('Your task here');

console.log(output.mergedPrompt);  // Final system prompt
console.log(output.mergedNotes);   // Reference notes
console.log(output.codex);         // Raw Codex output
console.log(output.claude);        // Raw Claude output
```

## Output Format

### Human-readable

```
=== JANUS MERGED SYSTEM PROMPT ===

[Clean, minimal system prompt for downstream agents]

=== REFERENCE NOTES ===

# Codex Proposal
[Codex's system prompt, plan, rationale]

# Claude Proposal
[Claude's critique and refinements]
```

### JSON (`--json` flag)

```json
{
  "mergedPrompt": "...",
  "mergedNotes": "...",
  "codex": {
    "provider": "codex",
    "systemPrompt": "...",
    "plan": "...",
    "rationale": "..."
  },
  "claude": {
    "provider": "claude",
    "systemPrompt": "...",
    "plan": "...",
    "rationale": "..."
  }
}
```

## Architecture

```
Task Input
    │
    ├─→ codexPlanner (OpenAI)
    │   └─→ SYSTEM PROMPT + PLAN + RATIONALE
    │
    └─→ claudePlanner (Anthropic/External/OpenAI)
        └─→ CRITIQUE + REFINEMENTS
    │
    ▼
orchestrator.ts
    └─→ mergedPrompt (for agents)
    └─→ mergedNotes (reference)
```

## Integration with codex-flow

Janus produces prompts that can be used with codex-flow:

```bash
# Get a merged prompt from Janus
JANUS_OUTPUT=$(node janus/dist/index.js "Your task" --json)

# Extract the merged prompt
MERGED_PROMPT=$(echo $JANUS_OUTPUT | jq -r '.mergedPrompt')

# Use it with codex-flow
node codex-flow/dist/index.js "$MERGED_PROMPT"
```

## Security

- Never commit `.env` files
- API keys are loaded from environment variables only
- No secrets are logged or printed

