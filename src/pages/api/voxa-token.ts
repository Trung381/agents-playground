import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { agent_code } = req.body;
  if (!agent_code) {
    return res.status(400).json({ error: "agent_code is required" });
  }

  const BASE_URL = "https://pbx.voxa.vn/api";

  try {
    // Step 1: Login
    console.log("[voxa-token] Step 1: Login to", BASE_URL + "/auth/login");
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ 
        username: process.env.VOXA_API_USERNAME, 
        password: process.env.VOXA_API_PASSWORD 
      }),
    });

    const loginData = await loginRes.json();
    console.log("[voxa-token] Login status:", loginRes.status);
    console.log("[voxa-token] Login response keys:", Object.keys(loginData));
    console.log("[voxa-token] Login response:", JSON.stringify(loginData, null, 2));

    const apiToken =
      loginData.access_token ||
      loginData.token ||
      loginData.accessToken ||
      loginData.jwt ||
      loginData.data?.access_token ||
      loginData.data?.token;

    if (!apiToken) {
      console.error("[voxa-token] ❌ Cannot find token in login response:", loginData);
      return res.status(401).json({
        error: "Login failed: no token in response",
        login_response: loginData,
      });
    }

    console.log("[voxa-token] ✅ Got API token (truncated):", String(apiToken).substring(0, 40) + "...");

    // Step 2: Create web session
    console.log("[voxa-token] Step 2: Create web session for agent:", agent_code);
    const sessionRes = await fetch(`${BASE_URL}/conversations/web-sessions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        tenant_id: 1,
        agent_code,
        channel: "web",
        external_ref: "manual-web-test",
        external_user_id: "test-user-001",
        caller_identity: "web-user-001",
        metadata: { test: true, source: "manual-curl" },
        customer: { name: "Anh Trung", phone: "0364757669" },
      }),
    });

    const sessionData = await sessionRes.json();
    console.log("[voxa-token] Session status:", sessionRes.status);
    console.log("[voxa-token] Session response:", JSON.stringify(sessionData, null, 2));

    if (!sessionRes.ok) {
      return res.status(sessionRes.status).json({
        error: "Session creation failed",
        session_response: sessionData,
      });
    }

    return res.status(200).json(sessionData);
  } catch (err: any) {
    console.error("[voxa-token] ❌ Unexpected error:", err?.message || err);
    return res.status(500).json({ error: err?.message || "Internal error" });
  }
}
