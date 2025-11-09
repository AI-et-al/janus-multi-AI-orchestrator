import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  throw new Error('ANTHROPIC_API_KEY is not set');
}

export const anthropic = new Anthropic({ apiKey });

export async function claudeFlow(system: string, user: string): Promise<string> {
  const msg = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-latest',
    max_tokens: 800,
    system,
    messages: [{ role: 'user', content: user }]
  });

  const text = msg.content
    .map(part => ('text' in part ? part.text : ''))
    .join('\n');

  return text.trim();
}
