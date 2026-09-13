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

type ConnectionTarget = {
  agentCode: string;
  tenantId: number;
  direction: "inbound" | "outbound";
};

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
  onConnect,
  onLogout,
}: {
  onConnect: (target: ConnectionTarget) => Promise<void>;
  onLogout: () => Promise<void>;
}) {
  const [agentCode, setAgentCode] = useState("");
  const [tenantId, setTenantId] = useState("1");
  const [direction, setDirection] = useState<"inbound" | "outbound">("inbound");
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

  async function connect(event: React.FormEvent) {
    event.preventDefault();
    const parsedTenantId = Number(tenantId);
    if (!agentCode.trim() || !Number.isSafeInteger(parsedTenantId)) return;
    setBusy(true);
    setError("");
    try {
      await onConnect({
        agentCode: agentCode.trim(),
        tenantId: parsedTenantId,
        direction,
      });
    } catch (cause) {
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
              Nhập agent và tenant để bắt đầu cuộc gọi
            </p>
          </div>
          <form
            onSubmit={connect}
            className="flex flex-col gap-4 p-8 bg-gray-900/30 text-left"
          >
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_150px] gap-3">
              <input
                className="text-white text-sm bg-transparent border border-gray-800 rounded-sm px-3 py-3"
                value={agentCode}
                onChange={(event) => {
                  setAgentCode(event.target.value);
                  localStorage.setItem("voxa_agent_code", event.target.value);
                }}
                placeholder="Agent ID / Agent code"
                aria-label="Agent ID"
                disabled={busy}
                required
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
                  }}
                  aria-label="Tenant ID"
                  disabled={busy}
                  required
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
                  }}
                  disabled={busy}
                >
                  {value === "inbound" ? "Inbound" : "Outbound"}
                </button>
              ))}
            </div>

            {error && (
              <p role="alert" className="text-xs text-red-400">
                {error}
              </p>
            )}
            <div className="grid grid-cols-[auto_1fr] gap-3 pt-1">
              <button
                type="button"
                className="px-5 py-3 text-sm rounded-md border border-gray-700 text-gray-300 hover:bg-gray-800 disabled:opacity-50"
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    await onLogout();
                  } catch (cause) {
                    setError(String(cause));
                    setBusy(false);
                  }
                }}
                disabled={busy}
              >
                Logout
              </button>
              <button
                className="flex items-center justify-center px-3 py-3 text-sm rounded-md bg-cyan-500 text-gray-950 hover:bg-cyan-400 disabled:opacity-50"
                disabled={
                  busy ||
                  !agentCode.trim() ||
                  !Number.isSafeInteger(Number(tenantId)) ||
                  Number(tenantId) < 1
                }
              >
                {busy ? "Đang kết nối..." : "Connect"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function CheckingSession() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-black text-sm text-gray-500">
      Đang khôi phục phiên đăng nhập...
    </div>
  );
}

function HomeInner() {
  const { config } = useConfig();
  const { toastMessage } = useToast();
  const [authState, setAuthState] = useState<
    "checking" | "signed-in" | "signed-out"
  >("checking");
  const [tokenSource, setTokenSource] = useState<
    TokenSourceConfigurable | undefined
  >();
  const conversationIdRef = useRef("");
  const cleanupPromiseRef = useRef<Promise<void>>(Promise.resolve());

  function endConversation(): Promise<void> {
    const conversationId = conversationIdRef.current;
    if (conversationId) {
      conversationIdRef.current = "";
      cleanupPromiseRef.current = cleanupPromiseRef.current.then(async () => {
        await fetch("/api/product/end", {
          method: "POST",
          credentials: "same-origin",
          keepalive: true,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversation_id: conversationId }),
        }).catch(() => undefined);
      });
    }
    return cleanupPromiseRef.current;
  }

  async function createSession(target: ConnectionTarget) {
    const session = await productRequest<ProductSession>("session", {
      agent_code: target.agentCode,
      tenant_id: target.tenantId,
      direction: target.direction,
      session_id: crypto.randomUUID(),
    });
    conversationIdRef.current = session.conversation_id;
    return {
      serverUrl: session.server_url,
      participantToken: session.participant_token,
    };
  }

  async function connectTarget(target: ConnectionTarget) {
    await endConversation();
    const source = TokenSource.custom(async () => {
      await endConversation();
      return createSession(target);
    });
    setTokenSource(source);
  }

  useEffect(() => {
    let mounted = true;
    productRequest("auth")
      .then(() => mounted && setAuthState("signed-in"))
      .catch(() => mounted && setAuthState("signed-out"));
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const cleanup = () => void endConversation();
    window.addEventListener("pagehide", cleanup);
    return () => window.removeEventListener("pagehide", cleanup);
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
        {authState === "checking" ? (
          <CheckingSession />
        ) : tokenSource ? (
          <Playground
            themeColors={themeColors}
            tokenSource={tokenSource}
            autoConnect
            agentOptions={
              config.settings.agent
                ? { agentName: config.settings.agent }
                : config.agent_dispatch
            }
            exitLabel="Quay lại"
            onSessionEnd={() => void endConversation()}
            onExit={() => setTokenSource(undefined)}
          />
        ) : authState === "signed-in" ? (
          <ManualConnect
            onConnect={connectTarget}
            onLogout={async () => {
              await endConversation();
              await productRequest("logout");
              setTokenSource(undefined);
              setAuthState("signed-out");
            }}
          />
        ) : (
          <LoginForm onSignedIn={() => setAuthState("signed-in")} />
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
