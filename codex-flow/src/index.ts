import { codexFlow } from './providers/openai';

async function main() {
  const [, , ...args] = process.argv;
  const prompt = args.join(' ') || 'Briefly describe your capabilities as Codex-Flow.';

  const system = [
    'You are Codex-Flow, an OpenAI-based executor and architect.',
    'You think in clear steps, plans, APIs, and code.',
    'Output should be concise, structurally sound, and immediately actionable.'
  ].join(' ');

  const reply = await codexFlow(system, prompt);
  console.log(reply);
}

main().catch(err => {
  console.error('codex-flow error:', err);
  process.exit(1);
});
