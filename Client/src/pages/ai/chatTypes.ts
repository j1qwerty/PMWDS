/** Shape of the assistant's reply. Mirrors ChatResponseDto on the server. */
export type ChatResponse = {
  message: string;
  intent?: string;
  suggestedActions?: string[];
  contextData?: unknown;
  requiresConfirmation?: boolean;
};

/** True when the reply is an error rather than an answer. */
export function isChatError(result: ChatResponse | null): boolean {
  return !!result && result.intent === "error";
}
