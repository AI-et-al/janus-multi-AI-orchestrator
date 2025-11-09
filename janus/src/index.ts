#!/usr/bin/env node
import { planWithJanus } from './orchestrator';

async function main() {
  const [, , ...args] = process.argv;

  // Parse arguments: support --json flag
  const jsonMode = args.includes('--json');
  const taskArgs = args.filter((arg) => arg !== '--json');

  const task =
    taskArgs.join(' ') ||
    'Design a cooperative multi-AI workflow for a GitHub repository.';

  const out = await planWithJanus(task);

  if (jsonMode) {
    // JSON output for programmatic use
    console.log(JSON.stringify(out, null, 2));
  } else {
    // Human-readable output
    console.log('=== JANUS MERGED SYSTEM PROMPT ===\n');
    console.log(out.mergedPrompt.trim(), '\n');

    console.log('=== REFERENCE NOTES ===\n');
    console.log(out.mergedNotes.trim(), '\n');
  }
}

main().catch((err) => {
  console.error('janus error:', err);
  process.exit(1);
});
