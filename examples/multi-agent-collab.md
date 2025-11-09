# Multi-Agent Collaboration Example

This guide shows how to use Dual-Flow (Janus + codex-flow) to coordinate multiple AI agents working on a GitHub repository.

## Overview

The typical workflow:

1. **Janus** generates a merged system prompt from Codex and Claude perspectives
2. **codex-flow** (or other executors) use that prompt to drive agents
3. Events are logged to SQLite for audit and debugging

## Basic Usage

### Step 1: Get a Merged Prompt from Janus

```bash
# Human-readable output
npm run janus "Refactor the authentication module to use JWT tokens"

# JSON output (for programmatic use)
npm run janus "Refactor the authentication module" --json > prompt.json
```

The JSON output contains:
- `mergedPrompt`: Clean system prompt for downstream agents
- `mergedNotes`: Reference notes with Codex and Claude raw outputs
- `codex`: Full Codex planner output
- `claude`: Full Claude planner output

### Step 2: Use the Prompt with codex-flow

```bash
# Extract the merged prompt and use it
MERGED_PROMPT=$(npm run janus "Your task" --json | jq -r '.mergedPrompt')
npm run codex-flow "$MERGED_PROMPT"
```

Or programmatically:

```typescript
import { planWithJanus } from './janus/src/orchestrator';
import { simpleChat, logEvent } from './codex-flow/src/providers/openai';
import { logEvent as logMemory } from './codex-flow/src/memory';

async function runAgent(task: string) {
  // Get merged prompt from Janus
  const janusOutput = await planWithJanus(task);
  
  // Use it with codex-flow
  const reply = await simpleChat(
    janusOutput.mergedPrompt,
    `Execute: ${task}`
  );
  
  // Log the event
  logMemory('multi-agent', 'execution', {
    task,
    prompt: janusOutput.mergedPrompt,
    reply,
    notes: janusOutput.mergedNotes
  });
  
  return reply;
}
```

## Integration Patterns

### Pattern 1: Cursor/Warp Integration

Create a shell script that Cursor or Warp can call:

```bash
#!/bin/bash
# scripts/janus-plan.sh

TASK="$*"
OUTPUT=$(npm run janus "$TASK" --json)
echo "$OUTPUT" | jq -r '.mergedPrompt'
```

Then in Cursor/Warp, you can use:
```bash
./scripts/janus-plan.sh "Add error handling to the API routes"
```

### Pattern 2: GitHub Actions Workflow

```yaml
name: AI Code Review
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm run install:all
      
      - name: Build
        run: npm run build
      
      - name: Generate plan
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: |
          npm run janus "Review this PR: ${{ github.event.pull_request.title }}" --json > plan.json
      
      - name: Comment plan
        uses: actions/github-script@v6
        with:
          script: |
            const plan = require('./plan.json');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## AI-Generated Review Plan\n\n${plan.mergedPrompt}\n\n<details>\n<summary>Reference Notes</summary>\n\n\`\`\`\n${plan.mergedNotes}\n\`\`\`\n</details>`
            });
```

### Pattern 3: Custom Orchestrator

Build a custom orchestrator that:
1. Calls Janus for planning
2. Distributes work to multiple agents
3. Uses codex-flow for execution
4. Logs everything

```typescript
import { planWithJanus } from '../janus/src/orchestrator';
import { simpleChat } from '../codex-flow/src/providers/openai';
import { logEvent } from '../codex-flow/src/memory';

interface AgentTask {
  id: string;
  description: string;
  agent: 'codex' | 'claude' | 'merged';
}

async function orchestrateMultiAgentWorkflow(
  mainTask: string,
  subtasks: AgentTask[]
) {
  // Get master plan from Janus
  const masterPlan = await planWithJanus(mainTask);
  logEvent('orchestrator', 'plan-generated', { task: mainTask });

  // Execute subtasks with appropriate agents
  const results = await Promise.all(
    subtasks.map(async (subtask) => {
      let systemPrompt = masterPlan.mergedPrompt;
      
      if (subtask.agent === 'codex') {
        systemPrompt = masterPlan.codex?.systemPrompt || systemPrompt;
      } else if (subtask.agent === 'claude') {
        systemPrompt = masterPlan.claude?.systemPrompt || systemPrompt;
      }

      const result = await simpleChat(
        systemPrompt,
        `Subtask ${subtask.id}: ${subtask.description}`
      );

      logEvent('orchestrator', 'subtask-complete', {
        subtaskId: subtask.id,
        result
      });

      return { subtask, result };
    })
  );

  return { masterPlan, results };
}
```

## Advanced: Custom Claude Integration

If you have a custom Claude service, configure it:

```bash
# In janus/.env
CLAUDE_FLOW_URL=https://your-claude-service.com/plan
# OR
CLAUDE_FLOW_CMD=/usr/local/bin/claude-flow
```

Your service should:
- Accept POST requests with `{ task: string }`
- Return JSON: `{ systemPrompt: string, plan?: string, rationale?: string }`
- Or return plain text (will be used as systemPrompt)

## Querying Event History

All events are logged to `codex-flow/codex-flow.db`:

```bash
# View recent events
sqlite3 codex-flow/codex-flow.db \
  "SELECT created_at, source, type FROM events ORDER BY created_at DESC LIMIT 10;"

# View full event data
sqlite3 codex-flow/codex-flow.db \
  "SELECT json_extract(data, '$.task') as task FROM events WHERE type = 'plan-generated';"
```

## Best Practices

1. **Always use Janus for planning**: Don't skip the planning step - it produces better prompts
2. **Log everything**: Use codex-flow's memory layer to track all agent interactions
3. **Review merged prompts**: Check `mergedNotes` to understand why Janus made certain decisions
4. **Iterate on tasks**: Break large tasks into subtasks and use Janus for each
5. **Monitor costs**: Both Codex and Claude API calls cost money - log usage

## Troubleshooting

### Janus returns stub responses

- Check that `OPENAI_API_KEY` is set in `janus/.env`
- For real Claude, set `ANTHROPIC_API_KEY` or configure external service
- Verify API keys are valid

### codex-flow fails

- Check that `OPENAI_API_KEY` is set in `codex-flow/.env`
- Verify the database file is writable: `chmod 644 codex-flow/codex-flow.db`

### Merged prompts are too verbose

- The orchestrator tries to extract structured sections
- If planners don't follow the format, prompts may be longer
- Check `mergedNotes` to see raw outputs

