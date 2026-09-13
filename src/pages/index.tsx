import { AnimatePresence, motion } from "framer-motion";
import { Inter } from "next/font/google";
import Head from "next/head";
import { useEffect, useMemo, useRef, useState } from "react";
import { TokenSource, TokenSourceConfigurable } from "livekit-client";

import { ToastProvider } from "@/components/toast/ToasterProvider";
import { PlaygroundToast } from "@/components/toast/PlaygroundToast";
import Playground from "@/components/playground/Playground";
import { ConfigProvider, useConfig } from "@/hooks/useConfig";
import { useToast } from "@/components/toast/ToasterProvider";

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

type Agent = {
  code: string;
  name?: string;
  direction?: string;
  status?: number | string;
};
type Session = { server_url: string; participant_token: string };
type ProductSession = Session & { conversation_id: string };

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

function LoginForm({ onSignedIn }: { onSignedIn: (agents: Agent[]) => void }) {
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
      const response = await productRequest<any>("agents");
      const list = Array.isArray(response)
        ? response
        : (response.items ?? response.data ?? []);
      onSignedIn(
        list.filter(
          (agent: Agent) =>
            agent.code &&
            agent.direction === "inbound" &&
            Number(agent.status) === 1,
        ),
      );
    } catch (cause) {
      setError(String(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex left-0 top-0 w-full h-full bg-black/80 items-center justify-center text-center">
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

function CallyticsConnect({
  agents,
  onConnected,
}: {
  agents: Agent[];
  onConnected: (
    source: TokenSourceConfigurable,
    conversationId: string,
  ) => void;
}) {
  const [search, setSearch] = useState("");
  const [agentCode, setAgentCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const filteredAgents = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return agents;
    return agents.filter((agent) =>
      `${agent.name ?? ""} ${agent.code}`.toLocaleLowerCase().includes(query),
    );
  }, [agents, search]);

  useEffect(() => {
    if (
      agentCode &&
      !filteredAgents.some((agent) => agent.code === agentCode)
    ) {
      setAgentCode("");
    }
  }, [agentCode, filteredAgents]);

  async function connect() {
    if (!agentCode || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await productRequest<ProductSession>("session", {
        agent_code: agentCode,
        session_id: crypto.randomUUID(),
      });
      onConnected(
        TokenSource.literal({
          serverUrl: response.server_url,
          participantToken: response.participant_token,
        }),
        response.conversation_id,
      );
    } catch (cause) {
      setError(String(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex left-0 top-0 w-full h-full bg-black/80 items-center justify-center text-center gap-2">
      <div className="min-h-[540px] w-full max-w-[480px]">
        <div className="flex flex-col bg-gray-950 w-full rounded-lg text-white border border-gray-900">
          <div className="px-10 space-y-2 py-6">
            <h1 className="text-2xl">Connect to playground</h1>
            <p className="text-sm text-gray-500">
              Chọn agent để bắt đầu cuộc gọi
            </p>
          </div>
          <div className="flex flex-col gap-4 p-8 bg-gray-900/30 text-left">
            <label className="flex flex-col gap-2">
              <span className="text-sm text-gray-300">Agent</span>
              <input
                className="text-white text-sm bg-transparent border border-gray-800 rounded-sm px-3 py-2"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm agent theo tên hoặc mã..."
                aria-label="Tìm agent theo tên hoặc mã"
                disabled={busy}
              />
              <span className="text-xs text-gray-500">
                {search.trim()
                  ? `${filteredAgents.length}/${agents.length} agent phù hợp`
                  : `${agents.length} agent khả dụng`}
              </span>
              <select
                className="text-white text-sm bg-gray-950 border border-gray-800 rounded-sm px-3 py-2"
                value={agentCode}
                onChange={(event) => setAgentCode(event.target.value)}
                disabled={busy}
              >
                <option value="">Chọn agent</option>
                {filteredAgents.map((agent) => (
                  <option value={agent.code} key={agent.code}>
                    {agent.name ?? agent.code} ({agent.code})
                  </option>
                ))}
                {search.trim() && filteredAgents.length === 0 && (
                  <option value="" disabled>
                    Không tìm thấy agent phù hợp
                  </option>
                )}
              </select>
            </label>
            {error && (
              <p role="alert" className="text-xs text-red-400">
                {error}
              </p>
            )}
            <button
              className="flex items-center justify-center px-3 py-2 text-sm rounded-md bg-cyan-500 text-gray-950 hover:bg-cyan-400 disabled:opacity-50"
              onClick={connect}
              disabled={busy || !agentCode}
            >
              {busy ? "Đang tạo phiên..." : "Connect"}
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
  const [agents, setAgents] = useState<Agent[] | null>(null);
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
        <meta
          property="og:image"
          content="https://livekit.io/images/og/agents-playground.png"
        />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
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
              setAgents(null);
              void productRequest("logout").catch(() => undefined);
            }}
          />
        ) : agents ? (
          <CallyticsConnect
            agents={agents}
            onConnected={(source, conversationId) => {
              conversationIdRef.current = conversationId;
              setTokenSource(source);
            }}
          />
        ) : (
          <LoginForm onSignedIn={setAgents} />
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
