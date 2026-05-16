/**
 * Acquires a JWT access token for Playwright recordings.
 * Sends a verification code to the admin phone, reads it from server stdout (dev mode),
 * and logs in via the auth API.
 */
const API = "http://localhost:8090/api/v1/auth";

async function fetchToken(): Promise<string> {
  // 1. Send verification code
  const sendRes = await fetch(`${API}/send-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifierType: "PHONE",
      identifier: "13800000000",
      scene: "LOGIN",
    }),
  });
  if (!sendRes.ok) throw new Error(`send-code failed: ${sendRes.status}`);

  // 2. Wait a beat for the server to log the code, then extract it from the mvn process stdout.
  //    In dev mode LoggingCodeSender prints "code=XXXXXX" to the console.
  await new Promise((r) => setTimeout(r, 500));

  const { execSync } = await import("child_process");
  let code = "";
  for (let i = 0; i < 3; i++) {
    try {
      const stdout = execSync(
        `tail -20 /private/tmp/claude-501/-Users-chuntingli/9f728f83-25d7-4130-9935-7f913595112c/tasks/bczkkh8rj.output | grep "code=" | tail -1`,
        { encoding: "utf-8" }
      );
      const m = stdout.match(/code=(\d{6})/);
      if (m) {
        code = m[1];
        break;
      }
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  if (!code) throw new Error("Could not extract verification code from server log");

  // 3. Login with the code
  const loginRes = await fetch(`${API}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifierType: "PHONE",
      identifier: "13800000000",
      code,
    }),
  });
  if (!loginRes.ok) throw new Error(`login failed: ${loginRes.status}`);

  const body = await loginRes.json();
  const token = body.accessToken || (body.data && body.data.accessToken);
  if (!token) throw new Error("No accessToken in login response");
  console.log(`Token acquired: ${(token as string).slice(0, 20)}...`);
  return token as string;
}

export { fetchToken };
