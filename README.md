# agent-log-investigator

[![CI](https://github.com/Jai-Gogineni/agent-log-investigator/actions/workflows/ci.yml/badge.svg)](https://github.com/Jai-Gogineni/agent-log-investigator/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-Agent-purple.svg)](https://modelcontextprotocol.io)

> Log investigation agent — finds root cause from CloudWatch/Datadog logs

## Architecture

```mermaid
flowchart LR
    A[CloudWatch] --> C[Log Ingester]
    B[Datadog] --> C
    C --> D[Pattern Analyzer]
    D --> E[Report Generator]
    E --> F[Incident Report]

    subgraph Analysis Engine
        D
        G[Regex Rules] --> D
        H[LLM Context] -.-> D
    end
```

## Quick Start

```bash
# Clone the repository
git clone https://github.com/Jai-Gogineni/agent-log-investigator.git
cd agent-log-investigator

# Install dependencies
npm install

# Build
npm run build
```

## Configuration

| Variable | Description |
|----------|-------------|
| `CLOUDWATCH_ENDPOINT` | AWS CloudWatch Logs endpoint |
| `DATADOG_API_KEY` | Datadog API key |
| `DATADOG_APP_KEY` | Datadog application key |

## Project Structure

```
src/
├── agent.ts              # MCP server entry point
├── log-ingester.ts       # CloudWatch/Datadog log fetcher
├── pattern-analyzer.ts   # Regex + LLM pattern detection
└── report-generator.ts   # Structured incident report output
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `investigate_logs` | Full pipeline: ingest → analyze → report |
| `analyze_pattern` | Analyze raw log lines for patterns |

## License

MIT © 2024 Jai Gogineni
