import 'dotenv/config';
import OpenAI from 'openai';
import { PlanResult } from '../types';
import { exec } from 'child_process';
import { promisify } from 'util';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { URL } from 'node:url';

const execAsync = promisify(exec);

/**
 * Claude planner integration modes (checked in order):
 * 1. Anthropic API (if ANTHROPIC_API_KEY is set)
 * 2. External HTTP service (if CLAUDE_FLOW_URL is set)
 * 3. External CLI command (if CLAUDE_FLOW_CMD is set)
 * 4. OpenAI fallback (default)
 */

/**
 * Attempts to use Anthropic's official SDK.
 * Returns null if not available or not configured.
 */
async function planWithAnthropic(task: string): Promise<PlanResult | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    // Dynamic import to avoid requiring @anthropic-ai/sdk as a hard dependency
    // $EDITOR src/providers/claudePlanner.tsOptional dependency, may not be installed
    const { Anthropic } = await import('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey });

    const sys = [
      'You are Claude-Flow, a cautious and reflective co-orchestrator.',
      'Your job is to critique plans, catch failure modes,',
      'and propose improvements, especially around safety, clarity, and alignment.',
      'Respond in three sections: SYSTEM PROMPT, PLAN, RATIONALE.'
    ].join(' ');

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      system: sys,
      messages: [
        {
          role: 'user',
          content: `Given the task:\n${task}\n\nPropose refinements and edge cases to consider.`
        }
      ]
    });

    type ContentBlock = {
      type: string;
      text?: string;
      // keep any other props if they exist, but we only care about text
    };
    
    const content =
      (message.content as ContentBlock[] | undefined)
        ?.filter((block) => block.type === 'text' && typeof block.text === 'string')
        .map((block) => block.text as string)
        .join('\n') ?? '';
    

    return {
      provider: 'claude',
      systemPrompt: content,
      plan: content,
      rationale: 'Claude-style critique via Anthropic API.'
    };
  } catch (err) {
    // If @anthropic-ai/sdk is not installed or API call fails, fall through
    if (err instanceof Error && err.message.includes('Cannot find module')) {
      return null;
    }
    // Log but don't throw - fall back to other modes
    console.error('Anthropic API error (falling back):', err);
    return null;
  }
}

/**
 * Attempts to call an external HTTP service.
 * Returns null if not configured or if the call fails.
 */
async function planWithHttpService(task: string): Promise<PlanResult | null> {
  const url = process.env.CLAUDE_FLOW_URL;
  if (!url) {
    return null;
  }

  try {
    const parsedUrl = new URL(url);
    const postData = JSON.stringify({ task });
    const isHttps = parsedUrl.protocol === 'https:';
    const requestModule = isHttps ? httpsRequest : httpRequest;

    return new Promise((resolve, reject) => {
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = requestModule(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            resolve({
              provider: 'claude',
              systemPrompt: result.systemPrompt || result.content || data,
              plan: result.plan || result.content || data,
              rationale: result.rationale || 'Claude-style critique via external HTTP service.'
            });
          } catch {
            // If response isn't JSON, treat it as plain text
            resolve({
              provider: 'claude',
              systemPrompt: data,
              plan: data,
              rationale: 'Claude-style critique via external HTTP service.'
            });
          }
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.write(postData);
      req.end();
    });
  } catch (err) {
    console.error('HTTP service error (falling back):', err);
    return null;
  }
}

/**
 * Attempts to call an external CLI command.
 * Returns null if not configured or if the call fails.
 */
async function planWithCliCommand(task: string): Promise<PlanResult | null> {
  const cmd = process.env.CLAUDE_FLOW_CMD;
  if (!cmd) {
    return null;
  }

  try {
    const { stdout, stderr } = await execAsync(`${cmd} "${task.replace(/"/g, '\\"')}"`);
    const content = stdout.trim() || stderr.trim();

    if (!content) {
      return null;
    }

    return {
      provider: 'claude',
      systemPrompt: content,
      plan: content,
      rationale: 'Claude-style critique via external CLI command.'
    };
  } catch (err) {
    console.error('CLI command error (falling back):', err);
    return null;
  }
}

/**
 * Fallback: uses OpenAI to simulate Claude-style critique.
 */
async function planWithOpenAIFallback(task: string): Promise<PlanResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      provider: 'claude',
      systemPrompt:
        'Claude-Flow stub: no API keys configured. Set ANTHROPIC_API_KEY, CLAUDE_FLOW_URL, CLAUDE_FLOW_CMD, or OPENAI_API_KEY.',
      plan: 'Treat this as a placeholder until real Claude integration is wired.',
      rationale: 'Stub response generated locally.'
    };
  }

  const openai = new OpenAI({ apiKey });

  const sys = [
    'You are Claude-Flow, a cautious and reflective co-orchestrator.',
    'Your job is to critique Codex-Flow\'s plan, catch failure modes,',
    'and propose improvements, especially around safety, clarity, and evals.',
    'Respond in three sections: SYSTEM PROMPT, PLAN, RATIONALE.'
  ].join(' ');

  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: sys },
      {
        role: 'user',
        content: `Given the task:\n${task}\n\nPropose refinements and edge cases to consider.`
      }
    ]
  });

  const content = res.choices[0]?.message?.content ?? '';

  return {
    provider: 'claude',
    systemPrompt: content,
    plan: content,
    rationale: 'Claude-style critique synthesized via OpenAI (fallback mode).'
  };
}

/**
 * Main Claude planner function.
 * Tries integration modes in order: Anthropic API → HTTP → CLI → OpenAI fallback.
 */
export async function claudePlan(task: string): Promise<PlanResult> {
  // Try Anthropic API first
  const anthropicResult = await planWithAnthropic(task);
  if (anthropicResult) {
    return anthropicResult;
  }

  // Try HTTP service
  try {
    const httpResult = await planWithHttpService(task);
    if (httpResult) {
      return httpResult;
    }
  } catch {
    // Fall through
  }

  // Try CLI command
  try {
    const cliResult = await planWithCliCommand(task);
    if (cliResult) {
      return cliResult;
    }
  } catch {
    // Fall through
  }

  // Fall back to OpenAI
  return planWithOpenAIFallback(task);
}
