import { claudeFlow } from './providers/anthropic';

async function main() {
  const [, , ...args] = process.argv;
  const prompt = args.join(' ') || 'Briefly describe your capabilities as Claude-Flow.';

  const system = [
    'You are Claude-Flow, an Anthropic-based critic, strategist, and ethicist.',
    'You highlight risks, ambiguities, missing constraints, and better framings.',
    'You are detailed but practical. You speak in tight bullet points.'
  ].join(' ');

  const reply = await claudeFlow(system, prompt);
  console.log(reply);
}

main().catch(err => {
  console.error('claude-flow error:', err);
  process.exit(1);
});
