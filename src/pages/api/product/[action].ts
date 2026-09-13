import type { NextApiRequest, NextApiResponse } from "next";

const ACCESS_COOKIE = "__Host-callytics-playground";
const REFRESH_COOKIE = "__Host-callytics-playground-refresh";
const ACCESS_MAX_AGE = 86_400;
const REFRESH_MAX_AGE = 7 * 86_400;

type AuthTokens = { token: string; refreshToken: string };

export const config = { api: { bodyParser: { sizeLimit: "16kb" } } };

function unwrap(payload: any) {
  return payload?.data ?? payload;
}

function isSafeToken(value: unknown): value is string {
  return (
    typeof value === "string" && value.length > 0 && !/[\r\n;]/.test(value)
  );
}

function tokenCookies(tokens: AuthTokens): string[] {
  return [
    `${ACCESS_COOKIE}=${tokens.token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${ACCESS_MAX_AGE}`,
    `${REFRESH_COOKIE}=${tokens.refreshToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${REFRESH_MAX_AGE}`,
  ];
}

function expiredCookies(): string[] {
  return [
    `${ACCESS_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`,
    `${REFRESH_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`,
  ];
}

async function readJson(response: Response): Promise<any> {
  return response.json().catch(() => ({}));
}

async function refreshTokens(
  apiBase: string,
  brandOrigin: string,
  refreshToken: string,
): Promise<AuthTokens | null> {
  const response = await fetch(`${apiBase}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: brandOrigin },
    body: JSON.stringify({ refreshToken }),
    signal: AbortSignal.timeout(45_000),
    redirect: "error",
  });
  if (!response.ok) return null;
  const data = unwrap(await readJson(response));
  if (!isSafeToken(data?.token) || !isSafeToken(data?.refreshToken)) {
    return null;
  }
  return { token: data.token, refreshToken: data.refreshToken };
}

async function callUpstream(
  apiBase: string,
  brandOrigin: string,
  accessToken: string,
  path: string,
  method: string,
  body?: Record<string, unknown>,
) {
  return fetch(apiBase + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      Origin: brandOrigin,
      Authorization: `Bearer ${accessToken}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(45_000),
    redirect: "error",
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  res.setHeader("Cache-Control", "no-store");
  const publicUrl = process.env.PLAYGROUND_PUBLIC_URL;
  const apiBase = process.env.CALLYTICS_API_BASE_URL?.replace(/\/+$/, "");
  const brandOrigin = process.env.PLAYGROUND_BRAND_ORIGIN;
  if (!publicUrl || !apiBase || !brandOrigin) {
    return res.status(503).json({ message: "Playground is not configured" });
  }
  if (req.headers.origin !== new URL(publicUrl).origin) {
    return res.status(403).json({ message: "Invalid request origin" });
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }

  const action = String(req.query.action);
  if (action === "logout") {
    res.setHeader("Set-Cookie", expiredCookies());
    return res.status(200).json({ success: true });
  }

  try {
    if (action === "login") {
      const upstream = await fetch(`${apiBase}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: brandOrigin },
        body: JSON.stringify({
          username: req.body?.username,
          password: req.body?.password,
        }),
        signal: AbortSignal.timeout(45_000),
        redirect: "error",
      });
      const payload = await readJson(upstream);
      const data = unwrap(payload);
      if (!upstream.ok) {
        return res
          .status(upstream.status)
          .json({ message: data?.message ?? "Callytics rejected the request" });
      }
      if (!isSafeToken(data?.token) || !isSafeToken(data?.refreshToken)) {
        throw new Error("Invalid login response");
      }
      res.setHeader(
        "Set-Cookie",
        tokenCookies({ token: data.token, refreshToken: data.refreshToken }),
      );
      return res.status(200).json({ success: true });
    }

    let accessToken = req.cookies[ACCESS_COOKIE];
    let refreshToken = req.cookies[REFRESH_COOKIE];
    if (!accessToken && refreshToken) {
      const refreshed = await refreshTokens(apiBase, brandOrigin, refreshToken);
      if (refreshed) {
        accessToken = refreshed.token;
        refreshToken = refreshed.refreshToken;
        res.setHeader("Set-Cookie", tokenCookies(refreshed));
      }
    }
    if (!accessToken) {
      res.setHeader("Set-Cookie", expiredCookies());
      return res.status(401).json({ message: "Sign in first" });
    }

    let path: string;
    let method = "POST";
    let body: Record<string, unknown> | undefined;
    if (action === "auth") {
      path = "/auth/profile";
      method = "GET";
    } else if (action === "session") {
      const tenantId = Number(req.body?.tenant_id);
      const direction = req.body?.direction;
      if (
        typeof req.body?.agent_code !== "string" ||
        !req.body.agent_code.trim() ||
        !Number.isSafeInteger(tenantId) ||
        tenantId < 1 ||
        (direction !== "inbound" && direction !== "outbound") ||
        !/^[a-zA-Z0-9_-]{8,64}$/.test(req.body.session_id ?? "")
      ) {
        return res.status(400).json({
          message: "Agent, tenant, direction and session are required",
        });
      }
      path = "/conversations/web-sessions";
      body = {
        agent_code: req.body.agent_code.trim(),
        tenant_id: tenantId,
        direction,
        session_id: req.body.session_id,
      };
    } else if (action === "end") {
      const conversationId = req.body?.conversation_id;
      if (
        typeof conversationId !== "string" ||
        !/^[a-zA-Z0-9_-]{1,64}$/.test(conversationId)
      ) {
        return res
          .status(400)
          .json({ message: "Invalid conversation identity" });
      }
      path = `/conversations/${encodeURIComponent(conversationId)}/end`;
    } else {
      return res.status(404).end();
    }

    let upstream = await callUpstream(
      apiBase,
      brandOrigin,
      accessToken,
      path,
      method,
      body,
    );
    if (upstream.status === 401 && refreshToken) {
      const refreshed = await refreshTokens(apiBase, brandOrigin, refreshToken);
      if (!refreshed) {
        res.setHeader("Set-Cookie", expiredCookies());
        return res.status(401).json({ message: "Session expired" });
      }
      res.setHeader("Set-Cookie", tokenCookies(refreshed));
      upstream = await callUpstream(
        apiBase,
        brandOrigin,
        refreshed.token,
        path,
        method,
        body,
      );
    } else if (upstream.status === 401) {
      res.setHeader("Set-Cookie", expiredCookies());
    }

    const payload = await readJson(upstream);
    const data = unwrap(payload);
    if (!upstream.ok) {
      return res
        .status(upstream.status)
        .json({ message: data?.message ?? "Callytics rejected the request" });
    }
    if (action === "auth") {
      return res.status(200).json({ authenticated: true });
    }
    if (action === "session") {
      const session = data?.session;
      if (
        !session?.access_token ||
        !session?.server_url ||
        !data?.conversation?.conversationId
      ) {
        throw new Error("Invalid session response");
      }
      return res.status(200).json({
        session_id: session.session_id,
        conversation_id: data.conversation.conversationId,
        server_url: session.server_url,
        participant_token: session.access_token,
        participant_identity: session.participant_identity,
      });
    }
    return res.status(200).json(data);
  } catch {
    return res.status(502).json({
      message: "Unable to reach Callytics; retry the request",
    });
  }
}
