import { CLOUD_ENABLED, CloudConnect } from "../cloud/CloudConnect";
import { Button } from "./button/Button";
import { useState, useEffect } from "react";
import { TokenSource, TokenSourceConfigurable } from "livekit-client";
import { PlaygroundConnectProps } from "@/lib/types";

const ConnectTab = ({ active, onClick, children }: any) => {
  let className = "px-2 py-1 text-sm";

  if (active) {
    className += " border-b border-cyan-500 text-cyan-500";
  } else {
    className += " text-gray-500 border-b border-transparent";
  }

  return (
    <button className={className} onClick={onClick}>
      {children}
    </button>
  );
};

import { LoadingSVG } from "./button/LoadingSVG";

const TokenConnect = ({
  accentColor,
  onConnectClicked,
}: PlaygroundConnectProps) => {
  const [url, setUrl] = useState<string>(
    process.env.NEXT_PUBLIC_LIVEKIT_URL || "wss://livekit.voxa.vn"
  );
  const [token, setToken] = useState<string>("");
  const [agentCode, setAgentCode] = useState<string>("");
  const [tenantId, setTenantId] = useState<string>("1");
  const [direction, setDirection] = useState<"inbound" | "outbound">("inbound");
  const [fetchError, setFetchError] = useState<string>("");
  const [isFetchingToken, setIsFetchingToken] = useState<boolean>(false);

  useEffect(() => {
    const saved = localStorage.getItem("voxa_agent_code");
    if (saved) {
      setAgentCode(saved);
    }
    const savedTenantId = localStorage.getItem("voxa_tenant_id");
    if (savedTenantId) {
      setTenantId(savedTenantId);
    }
    const savedDirection = localStorage.getItem("voxa_direction") as
      | "inbound"
      | "outbound";
    if (savedDirection === "inbound" || savedDirection === "outbound") {
      setDirection(savedDirection);
    }
  }, []);

  const handleAgentCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAgentCode(val);
    localStorage.setItem("voxa_agent_code", val);
  };

  const handleTenantIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTenantId(val);
    localStorage.setItem("voxa_tenant_id", val);
  };

  const handleDirectionChange = (dir: "inbound" | "outbound") => {
    setDirection(dir);
    localStorage.setItem("voxa_direction", dir);
  };

  const fetchToken = async () => {
    if (!agentCode) return;
    setIsFetchingToken(true);
    setFetchError("");
    console.log(
      "[fetchToken] Calling /api/voxa-token with agent_code:",
      agentCode,
      "tenant_id:",
      Number(tenantId) || 1,
      "direction:",
      direction
    );
    try {
      const res = await fetch("/api/voxa-token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          agent_code: agentCode,
          tenant_id: Number(tenantId) || 1,
          direction: direction,
        }),
      });

      console.log("[fetchToken] HTTP status:", res.status, res.statusText);
      const data = await res.json();
      console.log("[fetchToken] Response:", JSON.stringify(data, null, 2));

      if (!res.ok) {
        const msg =
          data.session_response?.message ||
          data.error ||
          "Failed to fetch token";
        setFetchError(msg);
        console.error("[fetchToken] ❌ API error:", msg, data);
        return;
      }

      if (data.session?.access_token) {
        console.log("[fetchToken] ✅ Got room token, prefilling...");
        setToken(data.session.access_token);
        setFetchError("");
      } else {
        console.warn("[fetchToken] ⚠️ No session.access_token in response:", data);
      }
    } catch (e: any) {
      setFetchError(e?.message || "Fetch error");
      console.error("[fetchToken] ❌ Fetch error:", e);
    } finally {
      setIsFetchingToken(false);
    }
  };

  return (
    <div className="flex left-0 top-0 w-full h-full bg-black/80 items-center justify-center text-center">
      <div className="flex flex-col gap-4 p-8 bg-gray-950 w-full text-white border-t border-gray-900">
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              value={agentCode}
              onChange={handleAgentCodeChange}
              className="flex-1 text-white text-sm bg-transparent border border-gray-800 rounded-sm px-3 py-2"
              placeholder="Agent code..."
            ></input>
            <div className="w-32 flex items-center border border-gray-800 rounded-sm px-2.5 bg-gray-900/40">
              <span className="text-xs text-gray-400 mr-1.5 select-none whitespace-nowrap">
                Tenant:
              </span>
              <input
                type="number"
                value={tenantId}
                onChange={handleTenantIdChange}
                className="w-full text-white text-sm bg-transparent outline-none py-2"
                placeholder="1"
                min={1}
              ></input>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-900 border border-gray-800 rounded-sm">
            <button
              type="button"
              className={`py-1.5 text-xs font-medium rounded-sm transition-all ${
                direction === "inbound"
                  ? "bg-gray-800 text-white shadow-sm border border-gray-700"
                  : "text-gray-400 hover:text-gray-200"
              }`}
              onClick={() => handleDirectionChange("inbound")}
            >
              Inbound
            </button>
            <button
              type="button"
              className={`py-1.5 text-xs font-medium rounded-sm transition-all ${
                direction === "outbound"
                  ? "bg-gray-800 text-white shadow-sm border border-gray-700"
                  : "text-gray-400 hover:text-gray-200"
              }`}
              onClick={() => handleDirectionChange("outbound")}
            >
              Outbound
            </button>
          </div>

          {fetchError && (
            <div className="text-xs text-red-400 text-left px-1">
              ⚠️ {fetchError}
            </div>
          )}

          <button
            className="flex items-center justify-center px-3 py-2 text-sm rounded-md transition ease-out duration-250 active:scale-[0.98] w-full bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={fetchToken}
            disabled={isFetchingToken || !agentCode}
          >
            {isFetchingToken ? <LoadingSVG /> : "Get Room Token"}
          </button>
          
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="text-white text-sm bg-transparent border border-gray-800 rounded-sm px-3 py-2"
            placeholder="wss://url"
          ></input>
          <textarea
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="text-white text-sm bg-transparent border border-gray-800 rounded-sm px-3 py-2"
            placeholder="room token..."
          ></textarea>
        </div>
        <Button
          accentColor={accentColor}
          className="w-full"
          disabled={!token || !url}
          onClick={() => {
            const source = TokenSource.literal({
              serverUrl: url,
              participantToken: token,
            });
            onConnectClicked(source, true);
          }}
        >
          Connect
        </Button>
      </div>
    </div>
  );
};

export const PlaygroundConnect = ({
  accentColor,
  onConnectClicked,
}: PlaygroundConnectProps) => {
  const [showCloud, setShowCloud] = useState(true);
  const copy = CLOUD_ENABLED
    ? "Connect to playground with VOXA Cloud or manually with a URL and token"
    : "Connect to playground with a URL and token";
  return (
    <div className="flex left-0 top-0 w-full h-full bg-black/80 items-center justify-center text-center gap-2">
      <div className="min-h-[540px]">
        <div className="flex flex-col bg-gray-950 w-full max-w-[480px] rounded-lg text-white border border-gray-900">
          <div className="flex flex-col gap-2">
            <div className="px-10 space-y-2 py-6">
              <h1 className="text-2xl">Connect to playground</h1>
              <p className="text-sm text-gray-500">{copy}</p>
            </div>
            {CLOUD_ENABLED && (
              <div className="flex justify-center pt-2 gap-4 border-b border-t border-gray-900">
                <ConnectTab
                  active={showCloud}
                  onClick={() => {
                    setShowCloud(true);
                  }}
                >
                  VOXA Cloud
                </ConnectTab>
                <ConnectTab
                  active={!showCloud}
                  onClick={() => {
                    setShowCloud(false);
                  }}
                >
                  Manual
                </ConnectTab>
              </div>
            )}
          </div>
          <div className="flex flex-col bg-gray-900/30 flex-grow">
            {showCloud && CLOUD_ENABLED ? (
              <CloudConnect
                accentColor={accentColor}
                onConnectClicked={onConnectClicked}
              />
            ) : (
              <TokenConnect
                accentColor={accentColor}
                onConnectClicked={onConnectClicked}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
