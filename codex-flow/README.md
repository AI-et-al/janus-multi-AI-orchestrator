# codex-flow

OpenAI-driven orchestrator and memory layer for dual-flow.

## Purpose

codex-flow provides:
- **Execution**: Clean OpenAI chat interface (`simpleChat`)
- **Memory**: SQLite-based event logging for all interactions
- **CLI**: Simple command-line interface for testing and integration

## Installation

```bash
npm install
npm run build
```

## Configuration

Create a `.env` file:

```bash
OPENAI_API_KEY=sk-your-key-here
```

## Usage

### CLI

```bash
node dist/index.js "Your prompt here"
```

Or via npm:

```bash
npm start "Your prompt here"
```

### Programmatic

```typescript
import { simpleChat } from './providers/openai';
import { logEvent } from './memory';

const reply = await simpleChat(
  'You are a helpful assistant.',
  'What is 2+2?'
);

logEvent('my-app', 'query', { prompt: 'What is 2+2?', reply });
```

## Memory Layer

All events are logged to `codex-flow.db` (SQLite) in the project directory:

```sql
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT DEFAULT (datetime('now')),
  source TEXT,
  type TEXT,
  data TEXT  -- JSON
);
```

Query events:

```bash
sqlite3 codex-flow.db "SELECT * FROM events ORDER BY created_at DESC LIMIT 10;"
```

## API

### `simpleChat(system: string, user: string): Promise<string>`

Sends a chat completion request to OpenAI and returns the assistant's reply.

### `logEvent(source: string, type: string, data: unknown): void`

Logs an event to the SQLite database. The `data` object is JSON-stringified.

## Security

- Never commit `.env` files
- API keys are loaded from environment variables only
- No secrets are logged in event data (only metadata)

