import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { LogIngester } from "./log-ingester.js";
import { PatternAnalyzer } from "./pattern-analyzer.js";
import { ReportGenerator } from "./report-generator.js";

const server = new Server(
  { name: "agent-log-investigator", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "investigate_logs",
      description: "Ingest logs from CloudWatch/Datadog, identify error patterns, suggest root cause",
      inputSchema: {
        type: "object" as const,
        properties: {
          source: { type: "string", enum: ["cloudwatch", "datadog"], description: "Log source" },
          logGroup: { type: "string", description: "Log group or service name" },
          timeRange: {
            type: "object",
            properties: {
              start: { type: "string", description: "ISO 8601 start time" },
              end: { type: "string", description: "ISO 8601 end time" },
            },
          },
          filterPattern: { type: "string", description: "Optional filter pattern" },
        },
        required: ["source", "logGroup"],
      },
    },
    {
      name: "analyze_pattern",
      description: "Analyze a set of log lines for error patterns",
      inputSchema: {
        type: "object" as const,
        properties: {
          logs: { type: "array", items: { type: "string" }, description: "Raw log lines" },
        },
        required: ["logs"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "investigate_logs": {
      const source = args?.source as "cloudwatch" | "datadog";
      const logGroup = args?.logGroup as string;
      const timeRange = args?.timeRange as { start?: string; end?: string } | undefined;
      const filterPattern = args?.filterPattern as string | undefined;

      const ingester = new LogIngester(source);
      const logs = await ingester.fetch({ logGroup, timeRange, filterPattern });

      const analyzer = new PatternAnalyzer();
      const patterns = analyzer.analyze(logs);

      const reporter = new ReportGenerator();
      const report = reporter.generate({ logGroup, source, patterns, logCount: logs.length });

      return { content: [{ type: "text", text: JSON.stringify(report, null, 2) }] };
    }

    case "analyze_pattern": {
      const logs = args?.logs as string[];
      const analyzer = new PatternAnalyzer();
      const patterns = analyzer.analyze(logs.map((line, i) => ({
        timestamp: new Date().toISOString(),
        message: line,
        level: "ERROR",
        source: `line-${i}`,
      })));
      return { content: [{ type: "text", text: JSON.stringify(patterns, null, 2) }] };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Agent Log Investigator MCP server running on stdio");
}

main().catch(console.error);
