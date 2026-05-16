/**
 * Shared auth helper — gets a fresh token and caches it to a temp file.
 * Multiple recording scripts share the same token to avoid code-consumption races.
 */
import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync } from "fs";

const TOKEN_FILE = "/tmp/zhizhou-playwright-token.txt";
const API = "http://localhost:8090/api/v1/auth";

export async function getToken(): Promise<string> {
  // Reuse cached token if it exists and not expired
  if (existsSync(TOKEN_FILE)) {
    const cached = readFileSync(TOKEN_FILE, "utf-8").trim();
    if (cached) return cached;
  }

  // Send verification code
  await fetch(`${API}/send-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifierType: "PHONE", identifier: "13800000000", scene: "LOGIN" }),
  });
  await new Promise((r) => setTimeout(r, 500));

  // Read code from Redis
  const code = execSync("redis-cli hget auth:code:LOGIN:13800000000 code", { encoding: "utf-8" }).trim();
  if (!code || code.length !== 6) throw new Error(`Invalid code from Redis: "${code}"`);

  // Login
  const res = await fetch(`${API}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifierType: "PHONE", identifier: "13800000000", code }),
  });
  const body = await res.json() as any;
  const token = body?.token?.accessToken;
  if (!token) {
    console.error("Login response:", JSON.stringify(body).slice(0, 200));
    throw new Error("No accessToken in login response");
  }

  writeFileSync(TOKEN_FILE, token);
  return token;
}
