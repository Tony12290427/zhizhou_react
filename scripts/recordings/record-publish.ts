/**
 * Records: Publish flow — create draft → fill in content → publish
 * Output: docs/gifs/02-publish-flow.webm → converted to .gif
 */
import { chromium } from "playwright";
import { execSync } from "child_process";
import { getToken } from "./shared-auth";

const BASE = "http://localhost:5173";
const OUTPUT = "docs/gifs";

(async () => {
  const token = await getToken();

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: OUTPUT, size: { width: 1440, height: 900 } },
  });

  await ctx.addInitScript((t: string) => {
    localStorage.setItem("auth-storage", JSON.stringify({ state: { accessToken: t, isAuthenticated: true } }));
  }, token);

  const page = await ctx.newPage();

  // 1. Navigate to publish page
  await page.goto(`${BASE}/publish`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // 2. Show the publish form — fill title and description
  const titleInput = page.locator("input[name='title'], [placeholder*='标题'], [aria-label*='标题']").first();
  if (await titleInput.isVisible()) {
    await titleInput.fill("Playwright 自动化测试帖文");
    await page.waitForTimeout(400);
  }

  const descInput = page.locator("textarea, [contenteditable='true']").first();
  if (await descInput.isVisible()) {
    await descInput.fill("这是一篇通过 Playwright 自动化录制的演示帖文，验证发布流程的完整性。");
    await page.waitForTimeout(400);
  }

  // 3. Show tag selector if visible
  const tagSelector = page.locator("[class*='tag'], [class*='TagSelector']").first();
  if (await tagSelector.isVisible()) {
    await tagSelector.click();
    await page.waitForTimeout(300);
  }

  // 4. Scroll to show full form
  await page.evaluate(() => window.scrollTo(0, 300));
  await page.waitForTimeout(600);

  await ctx.close();
  await browser.close();

  const files = execSync(`ls -t ${OUTPUT}/*.webm | head -1`, { encoding: "utf-8" }).trim();
  const outGif = `${OUTPUT}/02-publish-flow.gif`;
  execSync(
    `ffmpeg -y -i "${files}" -vf "fps=10,scale=720:-1:flags=lanczos" -pix_fmt rgb8 "${outGif}"`,
    { stdio: "inherit" }
  );
  console.log(`GIF saved: ${outGif}`);
})();
