import { useCallback, useEffect, useState } from "react";

import {
  HISTORY_CHANGED_EVENT,
  HistoryConversation,
  clearHistory,
  deleteConversation,
  loadHistory,
} from "@/lib/conversationHistory";

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleString("vi-VN");
}

function preview(conversation: HistoryConversation) {
  const first = conversation.messages[0]?.text ?? "";
  return first.length > 80 ? `${first.slice(0, 80)}…` : first;
}

export function ConversationHistory({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<HistoryConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const refresh = useCallback(() => setItems(loadHistory()), []);

  useEffect(() => {
    refresh();
    window.addEventListener(HISTORY_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(HISTORY_CHANGED_EVENT, refresh);
  }, [refresh]);

  const selected = items.find((item) => item.id === selectedId) ?? null;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 px-4 py-6">
      <div className="flex flex-col w-full max-w-[720px] max-h-full bg-gray-950 text-white border border-gray-900 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-900">
          <h2 className="text-lg">
            {selected ? "Chi tiết hội thoại" : "Lịch sử hội thoại"}
          </h2>
          <div className="flex gap-2">
            {selected ? (
              <>
                <button
                  className="px-3 py-1.5 text-sm rounded-md border border-gray-700 text-gray-300 hover:bg-gray-800"
                  onClick={() => setSelectedId(null)}
                >
                  Danh sách
                </button>
                <button
                  className="px-3 py-1.5 text-sm rounded-md border border-red-900 text-red-400 hover:bg-red-950"
                  onClick={() => {
                    deleteConversation(selected.id);
                    setSelectedId(null);
                  }}
                >
                  Xóa
                </button>
              </>
            ) : (
              items.length > 0 && (
                <button
                  className="px-3 py-1.5 text-sm rounded-md border border-red-900 text-red-400 hover:bg-red-950"
                  onClick={() => {
                    if (confirm("Xóa toàn bộ lịch sử hội thoại?")) {
                      clearHistory();
                    }
                  }}
                >
                  Xóa tất cả
                </button>
              )
            )}
            <button
              className="px-3 py-1.5 text-sm rounded-md border border-gray-700 text-gray-300 hover:bg-gray-800"
              onClick={onClose}
            >
              Đóng
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-4 text-left">
          {selected ? (
            <>
              <p className="text-xs text-gray-500 pb-3">
                {selected.agentCode} · tenant {selected.tenantId} ·{" "}
                {selected.direction} · {formatTime(selected.startedAt)}
              </p>
              <div className="flex flex-col gap-3">
                {selected.messages.map((message) => (
                  <div key={message.id} className="flex flex-col gap-0.5">
                    <div className="text-xs uppercase text-gray-600">
                      {message.name || (message.role === "user" ? "User" : "Agent")}{" "}
                      · {new Date(message.timestamp).toLocaleTimeString("vi-VN")}
                    </div>
                    <div
                      className={`text-sm whitespace-pre-line ${
                        message.role === "user" ? "text-gray-300" : "text-cyan-400"
                      }`}
                    >
                      {message.text}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-10">
              Chưa có hội thoại nào được lưu. Lịch sử chỉ lưu trên trình duyệt
              này.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-stretch border border-gray-800 rounded-md hover:bg-gray-900"
                >
                  <button
                    className="flex-1 min-w-0 text-left px-4 py-3"
                    onClick={() => setSelectedId(item.id)}
                  >
                    <div className="text-sm">
                      {item.agentCode}{" "}
                      <span className="text-gray-500">
                        · {item.direction} · {item.messages.length} tin nhắn
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatTime(item.startedAt)}
                    </div>
                    <div className="text-xs text-gray-400 truncate pt-1">
                      {preview(item)}
                    </div>
                  </button>
                  <button
                    className="px-4 text-sm text-red-400 hover:bg-red-950 rounded-r-md"
                    aria-label="Xóa hội thoại"
                    onClick={() => deleteConversation(item.id)}
                  >
                    Xóa
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
