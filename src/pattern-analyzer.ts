import type { LogEntry } from "./log-ingester.js";

export interface DetectedPattern {
  id: string;
  type: "error_spike" | "recurring_exception" | "timeout" | "dependency_failure" | "unknown";
  description: string;
  frequency: number;
  firstSeen: string;
  lastSeen: string;
  sampleMessages: string[];
  suggestedRootCause?: string;
}

interface PatternRule {
  name: string;
  type: DetectedPattern["type"];
  regex: RegExp;
  rootCauseTemplate: string;
}

export class PatternAnalyzer {
  private rules: PatternRule[] = [
    {
      name: "Connection Timeout",
      type: "timeout",
      regex: /(?:connection|request|socket)\s*(?:timed?\s*out|timeout)/i,
      rootCauseTemplate: "Network connectivity issue or downstream service unresponsive",
    },
    {
      name: "Database Connection Pool Exhausted",
      type: "dependency_failure",
      regex: /(?:connection\s*pool|pool\s*exhausted|too\s*many\s*connections)/i,
      rootCauseTemplate: "Database connection pool at capacity — check for connection leaks or scale pool size",
    },
    {
      name: "Out of Memory",
      type: "error_spike",
      regex: /(?:out\s*of\s*memory|OOM|heap\s*space|memory\s*limit)/i,
      rootCauseTemplate: "Memory leak or insufficient memory allocation for workload",
    },
    {
      name: "Authentication Failure",
      type: "recurring_exception",
      regex: /(?:401|unauthorized|auth.*fail|token.*expir)/i,
      rootCauseTemplate: "Authentication credentials expired or misconfigured",
    },
    {
      name: "Rate Limited",
      type: "dependency_failure",
      regex: /(?:429|rate\s*limit|throttl|too\s*many\s*requests)/i,
      rootCauseTemplate: "API rate limit exceeded — implement backoff or request quota increase",
    },
    {
      name: "Null Pointer / Undefined",
      type: "recurring_exception",
      regex: /(?:null\s*pointer|undefined\s*is\s*not|cannot\s*read\s*propert|TypeError)/i,
      rootCauseTemplate: "Null reference in application code — check recent code changes",
    },
  ];

  analyze(logs: LogEntry[]): DetectedPattern[] {
    const errorLogs = logs.filter((l) => l.level === "ERROR" || l.level === "WARN");
    const patternMap = new Map<string, { rule: PatternRule; entries: LogEntry[] }>();

    for (const log of errorLogs) {
      for (const rule of this.rules) {
        if (rule.regex.test(log.message)) {
          const existing = patternMap.get(rule.name);
          if (existing) {
            existing.entries.push(log);
          } else {
            patternMap.set(rule.name, { rule, entries: [log] });
          }
          break;
        }
      }
    }

    const patterns: DetectedPattern[] = [];
    for (const [, { rule, entries }] of patternMap) {
      const sorted = entries.sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      patterns.push({
        id: `pattern_${Math.random().toString(36).slice(2, 10)}`,
        type: rule.type,
        description: rule.name,
        frequency: entries.length,
        firstSeen: sorted[0].timestamp,
        lastSeen: sorted[sorted.length - 1].timestamp,
        sampleMessages: entries.slice(0, 3).map((e) => e.message),
        suggestedRootCause: rule.rootCauseTemplate,
      });
    }

    return patterns.sort((a, b) => b.frequency - a.frequency);
  }
}
