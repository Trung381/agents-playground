import type { NextApiRequest, NextApiResponse } from "next";

const COOKIE_NAME = "__Host-callytics-playground";

export const config = { api: { bodyParser: { sizeLimit: "16kb" } } };

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
  const sessionToken = req.cookies[COOKIE_NAME];
  if (action !== "login" && !sessionToken) {
    return res.status(401).json({ message: "Sign in first" });
  }
  if (action === "logout") {
    res.setHeader(
      "Set-Cookie",
      `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`,
    );
    return res.status(200).json({ success: true });
  }

  let path: string;
  let method = "POST";
  let body: Record<string, unknown> | undefined;
  if (action === "login") {
    path = "/auth/login";
    body = { username: req.body?.username, password: req.body?.password };
  } else if (action === "agents") {
    path = "/agent?limit=100";
    method = "GET";
  } else if (action === "session") {
    if (
      typeof req.body?.agent_code !== "string" ||
      !req.body.agent_code.trim() ||
      !/^[a-zA-Z0-9_-]{8,64}$/.test(req.body.session_id ?? "")
    ) {
      return res
        .status(400)
        .json({ message: "Agent and session identity are required" });
    }
    path = "/conversations/web-sessions";
    body = {
      agent_code: req.body.agent_code.trim(),
      direction: "inbound",
      session_id: req.body.session_id,
    };
  } else if (action === "end") {
    const conversationId = req.body?.conversation_id;
    if (
      typeof conversationId !== "string" ||
      !/^[a-zA-Z0-9_-]{1,64}$/.test(conversationId)
    ) {
      return res.status(400).json({ message: "Invalid conversation identity" });
    }
    path = `/conversations/${encodeURIComponent(conversationId)}/end`;
  } else {
    return res.status(404).end();
  }

  try {
    const upstream = await fetch(apiBase + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        Origin: brandOrigin,
        ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(45_000),
      redirect: "error",
    });
    const payload = await upstream.json();
    const data = payload.data ?? payload;
    if (!upstream.ok) {
      return res
        .status(upstream.status)
        .json({ message: data.message ?? "Callytics rejected the request" });
    }
    if (action === "login") {
      if (typeof data.token !== "string" || /[\r\n;]/.test(data.token))
        throw new Error("Invalid login response");
      res.setHeader(
        "Set-Cookie",
        `${COOKIE_NAME}=${data.token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`,
      );
      return res.status(200).json({ success: true });
    }
    if (action === "session") {
      const session = data.session;
      if (
        !session?.access_token ||
        !session?.server_url ||
        !data.conversation?.conversationId
      )
        throw new Error("Invalid session response");
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
    return res
      .status(502)
      .json({
        message: "Unable to reach Callytics; retry using the same session",
      });
  }
}
