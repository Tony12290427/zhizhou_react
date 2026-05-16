/**
 * Records: Feed waterfall scroll → like a post → open detail → go back
 * Output: docs/gifs/01-feed-browse.webm → converted to .gif
 */
import { chromium } from "playwright";
import { execSync } from "child_process";
import { getToken } from "./shared-auth";

const BASE = "http://localhost:5173";
const OUTPUT = "docs/gifs";

(async () => {
  const token = await getToken();
  console.log(`Token acquired: ${token.slice(0, 20)}...`);

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: OUTPUT, size: { width: 1440, height: 900 } },
  });

  // Inject auth token into localStorage before any navigation
  await ctx.addInitScript((t: string) => {
    localStorage.setItem(
      "auth-storage",
      JSON.stringify({ state: { accessToken: t, isAuthenticated: true } })
    );
  }, token);

  const page = await ctx.newPage();

  // 1. Homepage feed
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  // 2. Scroll down to show waterfall loading more posts
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForTimeout(600);
  await page.evaluate(() => window.scrollTo(0, 1200));
  await page.waitForTimeout(600);
  await page.evaluate(() => window.scrollTo(0, 500)); // scroll back up a bit
  await page.waitForTimeout(400);

  // 3. Click the first post to open detail
  const firstPost = page.locator(".post-item, [class*='PostItem'], [class*='post-item']").first();
  if (await firstPost.isVisible()) {
    await firstPost.click();
    await page.waitForURL("**/post/**");
    await page.waitForTimeout(1000);

    // 4. Show like count, scroll through detail
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(600);
  }

  // 5. Navigate to explore page
  await page.goto(`${BASE}/explore`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  await ctx.close();
  await browser.close();

  // Convert webm to gif
  const files = execSync(`ls -t ${OUTPUT}/*.webm | head -1`, { encoding: "utf-8" }).trim();
  const outGif = `${OUTPUT}/01-feed-browse.gif`;
  execSync(
    `ffmpeg -y -i "${files}" -vf "fps=10,scale=720:-1:flags=lanczos" -pix_fmt rgb8 "${outGif}"`,
    { stdio: "inherit" }
  );
  console.log(`GIF saved: ${outGif}`);
})();
