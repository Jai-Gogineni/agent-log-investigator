import type { DetectedPattern } from "./pattern-analyzer.js";

export interface IncidentReport {
  id: string;
  generatedAt: string;
  summary: string;
  source: string;
  logGroup: string;
  totalLogsAnalyzed: number;
  patterns: DetectedPattern[];
  rootCauseAnalysis: RootCauseEntry[];
  recommendations: string[];
  severity: "low" | "medium" | "high" | "critical";
}

export interface RootCauseEntry {
  rank: number;
  cause: string;
  confidence: "high" | "medium" | "low";
  evidence: string[];
}

interface ReportInput {
  logGroup: string;
  source: string;
  patterns: DetectedPattern[];
  logCount: number;
}

export class ReportGenerator {
  generate(input: ReportInput): IncidentReport {
    const severity = this.calculateSeverity(input.patterns);
    const rootCauses = this.deriveRootCauses(input.patterns);
    const recommendations = this.generateRecommendations(input.patterns);

    return {
      id: `report_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      generatedAt: new Date().toISOString(),
      summary: this.generateSummary(input, severity),
      source: input.source,
      logGroup: input.logGroup,
      totalLogsAnalyzed: input.logCount,
      patterns: input.patterns,
      rootCauseAnalysis: rootCauses,
      recommendations,
      severity,
    };
  }

  private calculateSeverity(patterns: DetectedPattern[]): IncidentReport["severity"] {
    const totalErrors = patterns.reduce((sum, p) => sum + p.frequency, 0);
    const hasSpike = patterns.some((p) => p.type === "error_spike");

    if (hasSpike || totalErrors > 100) return "critical";
    if (totalErrors > 50) return "high";
    if (totalErrors > 10) return "medium";
    return "low";
  }

  private deriveRootCauses(patterns: DetectedPattern[]): RootCauseEntry[] {
    return patterns
      .filter((p) => p.suggestedRootCause)
      .map((p, i) => ({
        rank: i + 1,
        cause: p.suggestedRootCause!,
        confidence: p.frequency > 20 ? ("high" as const) : p.frequency > 5 ? ("medium" as const) : ("low" as const),
        evidence: p.sampleMessages,
      }));
  }

  private generateRecommendations(patterns: DetectedPattern[]): string[] {
    const recommendations: string[] = [];

    for (const pattern of patterns) {
      switch (pattern.type) {
        case "timeout":
          recommendations.push("Increase timeout thresholds or investigate network latency");
          break;
        case "dependency_failure":
          recommendations.push("Check downstream service health and implement circuit breaker");
          break;
        case "error_spike":
          recommendations.push("Correlate error spike with recent deployments — consider rollback");
          break;
        case "recurring_exception":
          recommendations.push("Review recent code changes for null safety and error handling");
          break;
      }
    }

    return [...new Set(recommendations)];
  }

  private generateSummary(input: ReportInput, severity: string): string {
    const patternCount = input.patterns.length;
    return `Analyzed ${input.logCount} logs from ${input.source}/${input.logGroup}. ` +
      `Found ${patternCount} distinct error pattern(s). Severity: ${severity.toUpperCase()}.`;
  }
}
