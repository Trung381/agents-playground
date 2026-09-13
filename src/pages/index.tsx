import { AnimatePresence, motion } from "framer-motion";
import { Inter } from "next/font/google";
import Head from "next/head";
import { useEffect, useRef, useState } from "react";
import { TokenSource, TokenSourceConfigurable } from "livekit-client";

import Playground from "@/components/playground/Playground";
import { PlaygroundToast } from "@/components/toast/PlaygroundToast";
import { ToastProvider, useToast } from "@/components/toast/ToasterProvider";
import { ConfigProvider, useConfig } from "@/hooks/useConfig";

const themeColors = [
  "cyan",
  "green",
  "amber",
  "blue",
  "violet",
  "rose",
  "pink",
  "teal",
];
const inter = Inter({ subsets: ["latin"] });

type ProductSession = {
  conversation_id: string;
  server_url: string;
  participant_token: string;
};

async function productRequest<T = any>(
  action: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch(`/api/product/${action}`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message ?? "Request failed");
  return data;
}

function LoginForm({ onSignedIn }: { onSignedIn: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await productRequest("login", { username, password });
      setPassword("");
      onSignedIn();
    } catch (cause) {
      setError(String(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex left-0 top-0 w-full h-full bg-black/80 items-center justify-center text-center px-4">
      <div className="flex flex-col gap-4 p-8 bg-gray-950 w-full max-w-[480px] rounded-lg text-white border border-gray-900">
        <div className="px-2 space-y-2 py-2">
          <h1 className="text-2xl">Connect to playground</h1>
          <p className="text-sm text-gray-500">
            Đăng nhập bằng tài khoản Callytics
          </p>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3 text-left">
          <input
            className="text-white text-sm bg-transparent border border-gray-800 rounded-sm px-3 py-2"
            autoComplete="username"
            placeholder="Tài khoản Callytics"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />
          <input
            className="text-white text-sm bg-transparent border border-gray-800 rounded-sm px-3 py-2"
            autoComplete="current-password"
            type="password"
            placeholder="Mật khẩu"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          {error && (
            <p role="alert" className="text-xs text-red-400">
              {error}
            </p>
          )}
          <button
            className="flex items-center justify-center px-3 py-2 text-sm rounded-md bg-cyan-500 text-gray-950 hover:bg-cyan-400 disabled:opacity-50"
            disabled={busy}
          >
            {busy ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ManualConnect({
  onSessionCreated,
  onConnected,
}: {
  onSessionCreated: (conversationId: string) => void;
  onConnected: (source: TokenSourceConfigurable) => void;
}) {
  const [agentCode, setAgentCode] = useState("");
  const [tenantId, setTenantId] = useState("1");
  const [direction, setDirection] = useState<"inbound" | "outbound">("inbound");
  const [serverUrl, setServerUrl] = useState("wss://livekit.voxa.vn");
  const [roomToken, setRoomToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setAgentCode(localStorage.getItem("voxa_agent_code") ?? "");
    setTenantId(localStorage.getItem("voxa_tenant_id") ?? "1");
    const savedDirection = localStorage.getItem("voxa_direction");
    if (savedDirection === "inbound" || savedDirection === "outbound") {
      setDirection(savedDirection);
    }
  }, []);

  function invalidateToken() {
    setRoomToken("");
    setError("");
  }

  async function getRoomToken() {
    if (!agentCode.trim() || !tenantId || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await productRequest<ProductSession>("session", {
        agent_code: agentCode.trim(),
        tenant_id: Number(tenantId),
        direction,
        session_id: crypto.randomUUID(),
      });
      setServerUrl(response.server_url);
      setRoomToken(response.participant_token);
      onSessionCreated(response.conversation_id);
    } catch (cause) {
      setRoomToken("");
      setError(String(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex left-0 top-0 w-full h-full bg-black/80 items-center justify-center text-center px-4 py-6">
      <div className="w-full max-w-[560px]">
        <div className="flex flex-col bg-gray-950 w-full rounded-lg text-white border border-gray-900 overflow-hidden">
          <div className="px-10 space-y-2 py-8 border-b border-gray-900">
            <h1 className="text-3xl">Connect to playground</h1>
            <p className="text-sm text-gray-500">
              Nhập agent, tenant và lấy room token để kết nối
            </p>
          </div>
          <div className="flex flex-col gap-4 p-8 bg-gray-900/30 text-left">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_150px] gap-3">
              <input
                className="text-white text-sm bg-transparent border border-gray-800 rounded-sm px-3 py-3"
                value={agentCode}
                onChange={(event) => {
                  setAgentCode(event.target.value);
                  localStorage.setItem("voxa_agent_code", event.target.value);
                  invalidateToken();
                }}
                placeholder="Agent ID / Agent code"
                aria-label="Agent ID"
                disabled={busy}
              />
              <div className="flex items-center border border-gray-800 rounded-sm px-3 bg-gray-900/40">
                <span className="text-sm text-gray-500 mr-2 whitespace-nowrap">
                  Tenant:
                </span>
                <input
                  type="number"
                  className="w-full min-w-0 text-white text-sm bg-transparent outline-none py-3"
                  value={tenantId}
                  min={1}
                  step={1}
                  onChange={(event) => {
                    setTenantId(event.target.value);
                    localStorage.setItem("voxa_tenant_id", event.target.value);
                    invalidateToken();
                  }}
                  aria-label="Tenant ID"
                  disabled={busy}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-900 border border-gray-800 rounded-sm">
              {(["inbound", "outbound"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`py-2 text-sm font-medium rounded-sm transition-all ${
                    direction === value
                      ? "bg-gray-800 text-white shadow-sm border border-gray-700"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                  onClick={() => {
                    setDirection(value);
                    localStorage.setItem("voxa_direction", value);
                    invalidateToken();
                  }}
                  disabled={busy}
                >
                  {value === "inbound" ? "Inbound" : "Outbound"}
                </button>
              ))}
            </div>

            <button
              className="flex items-center justify-center px-3 py-3 text-sm rounded-md bg-gray-800 text-gray-200 hover:bg-gray-700 disabled:opacity-50"
              onClick={getRoomToken}
              disabled={busy || !agentCode.trim() || !tenantId}
            >
              {busy ? "Đang lấy room token..." : "Get Room Token"}
            </button>

            <input
              className="text-white text-sm bg-transparent border border-gray-800 rounded-sm px-3 py-3"
              value={serverUrl}
              onChange={(event) => setServerUrl(event.target.value)}
              placeholder="wss://livekit.voxa.vn"
              aria-label="LiveKit URL"
            />
            <textarea
              className="min-h-28 resize-y text-white text-sm bg-transparent border border-gray-800 rounded-sm px-3 py-3"
              value={roomToken}
              onChange={(event) => setRoomToken(event.target.value)}
              placeholder="room token..."
              aria-label="Room token"
            />

            {error && (
              <p role="alert" className="text-xs text-red-400">
                {error}
              </p>
            )}
            <button
              className="flex items-center justify-center px-3 py-3 text-sm rounded-md bg-cyan-500 text-gray-950 hover:bg-cyan-400 disabled:opacity-50"
              onClick={() =>
                onConnected(
                  TokenSource.literal({
                    serverUrl,
                    participantToken: roomToken,
                  }),
                )
              }
              disabled={!serverUrl.trim() || !roomToken.trim()}
            >
              Connect
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function HomeInner() {
  const { config } = useConfig();
  const { toastMessage } = useToast();
  const [signedIn, setSignedIn] = useState(false);
  const [tokenSource, setTokenSource] = useState<
    TokenSourceConfigurable | undefined
  >();
  const conversationIdRef = useRef("");

  function endConversation() {
    const conversationId = conversationIdRef.current;
    if (!conversationId) return;
    conversationIdRef.current = "";
    void fetch("/api/product/end", {
      method: "POST",
      credentials: "same-origin",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversation_id: conversationId }),
    });
  }

  useEffect(() => {
    window.addEventListener("pagehide", endConversation);
    return () => window.removeEventListener("pagehide", endConversation);
  }, []);

  return (
    <>
      <Head>
        <title>{config.title}</title>
        <meta name="description" content={config.description} />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main
        className={`${inter.className} relative flex flex-col justify-center px-4 items-center h-full w-full bg-black repeating-square-background`}
      >
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              className="left-0 right-0 top-0 absolute z-10"
              initial={{ opacity: 0, translateY: -50 }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0, translateY: -50 }}
            >
              <PlaygroundToast />
            </motion.div>
          )}
        </AnimatePresence>
        {tokenSource ? (
          <Playground
            themeColors={themeColors}
            tokenSource={tokenSource}
            autoConnect
            agentOptions={
              config.settings.agent
                ? { agentName: config.settings.agent }
                : config.agent_dispatch
            }
            onSessionEnd={endConversation}
            onLogout={() => {
              setTokenSource(undefined);
              setSignedIn(false);
              void productRequest("logout").catch(() => undefined);
            }}
          />
        ) : signedIn ? (
          <ManualConnect
            onSessionCreated={(conversationId) => {
              endConversation();
              conversationIdRef.current = conversationId;
            }}
            onConnected={setTokenSource}
          />
        ) : (
          <LoginForm onSignedIn={() => setSignedIn(true)} />
        )}
      </main>
    </>
  );
}

export default function Home() {
  return (
    <ToastProvider>
      <ConfigProvider>
        <HomeInner />
      </ConfigProvider>
    </ToastProvider>
  );
}
