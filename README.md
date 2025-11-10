# Janus: Multi-AI Orchestration [GPT-5 Codex & Claude Code now, Gemini to come on release of 3.0] 

Janus is a production-ready system for coordinating multiple AI agents in collaborative workflows. It consists of two core components:

- **`codex-flow/`**: Execution, memory, and logging layer powered by OpenAI
- **`janus/`**: Dual-headed planner (Codex + Claude-style) that produces merged system prompts and reference notes

## Architecture

```
┌─────────────────┐
│   Janus         │  ← Planning & Prompt Orchestration
│  (Codex+Claude) │
└────────┬────────┘
         │ merged prompts
         ▼
┌─────────────────┐
│  codex-flow     │  ← Execution & Memory
│  (OpenAI)       │
└─────────────────┘
```

### codex-flow

The execution and memory layer that:
- Provides a clean OpenAI chat interface (`simpleChat`)
- Logs all events to a local SQLite database
- Serves as the runtime for agents executing tasks

**Use case**: When you need an AI agent to perform work and maintain a memory of what happened.

### janus

The planning and orchestration layer that:
- Calls both Codex and Claude-style planners in parallel
- Merges their outputs into a single, coherent system prompt
- Produces reference notes for downstream agents
- Supports multiple Claude integration modes (Anthropic API, external service, or OpenAI fallback)

**Use case**: When you need to generate high-quality system prompts for multi-AI collaboration on repositories, codebases, or complex tasks.

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- OpenAI API key (required)
- Anthropic API key (optional, for real Claude integration)

### Installation

```bash
# Install dependencies for both projects
npm install
npm --prefix codex-flow install
npm --prefix janus install

# Build both projects
npm run build
```

### Configuration

1. Copy `.env.example` files to `.env` in each project directory:
   ```bash
   cp codex-flow/.env.example codex-flow/.env
   cp janus/.env.example janus/.env
   ```

2. Add your API keys:
   - `codex-flow/.env`: `OPENAI_API_KEY=sk-...`
   - `janus/.env`: `OPENAI_API_KEY=sk-...` (and optionally `ANTHROPIC_API_KEY=sk-ant-...`)

### Usage

#### Run codex-flow

```bash
npm run codex-flow "Your task here"
```

#### Run janus

```bash
# Human-readable output
npm run janus "Design a multi-AI workflow for repository collaboration"

# JSON output
npm run janus "Your task" --json
```

## Integration with External Tools

Dual-Flow is designed to be used by tools like Cursor, Warp, or custom automation:

1. **Call Janus** to get a merged system prompt for your task
2. **Use that prompt** to drive agents (via codex-flow or other executors)
3. **Log events** to track what happened (codex-flow's memory layer)

See [`examples/multi-agent-collab.md`](./examples/multi-agent-collab.md) for detailed integration patterns.

## Project Structure

```
dual-flow/
├── codex-flow/          # Execution & memory layer
│   ├── src/
│   │   ├── index.ts     # CLI entry point
│   │   ├── providers/   # OpenAI integration
│   │   └── memory/      # SQLite event logging
│   └── package.json
├── janus/               # Planning & orchestration
│   ├── src/
│   │   ├── index.ts     # CLI entry point
│   │   ├── orchestrator.ts  # Merging logic
│   │   └── providers/   # Codex & Claude planners
│   └── package.json
├── examples/            # Usage examples
└── package.json         # Root scripts
```

## Development

```bash
# Build both projects
npm run build

# Run tests (if any)
npm test

# Run individual components
npm run codex-flow "test"
npm run janus "test"
```

## License

MIT License - see [LICENSE](./LICENSE) file for details.

## Contributing

This is a production system. Contributions should:
- Maintain TypeScript strict mode
- Follow the "boring reliability over clever hacks" principle
- Never commit secrets or API keys
- Include tests for new features

