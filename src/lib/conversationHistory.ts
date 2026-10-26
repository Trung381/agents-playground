// Conversation history lives only in this browser's localStorage. Nothing here
// is sent to the backend or stored in a database.

export type HistoryMessage = {
  id: string;
  role: "user" | "agent";
  name: string;
  text: string;
  timestamp: number;
};

export type HistoryConversation = {
  id: string;
  agentCode: string;
  tenantId: number;
  direction: "inbound" | "outbound";
  startedAt: number;
  updatedAt: number;
  messages: HistoryMessage[];
};

const STORAGE_KEY = "voxa_playground_history_v1";
const MAX_CONVERSATIONS = 100;
export const HISTORY_CHANGED_EVENT = "voxa-history-changed";

export function loadHistory(): HistoryConversation[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(items: HistoryConversation[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event(HISTORY_CHANGED_EVENT));
  } catch {
    // Quota exceeded or storage blocked: history is best-effort.
  }
}

export function upsertConversation(conversation: HistoryConversation) {
  const items = loadHistory().filter((item) => item.id !== conversation.id);
  items.unshift(conversation);
  persist(items.slice(0, MAX_CONVERSATIONS));
}

export function deleteConversation(id: string) {
  persist(loadHistory().filter((item) => item.id !== id));
}

export function clearHistory() {
  persist([]);
}
