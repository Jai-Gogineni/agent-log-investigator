import Anthropic from "@anthropic-ai/sdk";
export class LogInvestigatorAgent {
  private client: Anthropic;
  constructor(apiKey: string) { this.client = new Anthropic({ apiKey }); }
  async investigate(logs: string[]): Promise<{ rootCause: string; suggestion: string }> {
    const response = await this.client.messages.create({
      model: "claude-sonnet-4-20250514", max_tokens: 1024,
      messages: [{ role: "user", content: `Analyze these logs and identify root cause:\n${logs.join("\n")}` }]
    });
    const text = response.content[0].type === "text" ? response.content[0].text : "";
    return { rootCause: text.split("\n")[0], suggestion: text };
  }
}
