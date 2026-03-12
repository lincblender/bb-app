import { mkdir } from "node:fs/promises";
import path from "node:path";
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";
import { chromium, type Browser, type BrowserContext, type Page } from "@playwright/test";

export type VideoMode = "guided" | "auto";

export interface VideoRuntimeOptions {
  baseUrl: string;
  email: string;
  password: string;
  outputDir: string;
  headless: boolean;
  mode: VideoMode;
  slowMo: number;
  timeoutMs: number;
}

export interface VideoRuntime {
  options: VideoRuntimeOptions;
  page: Page;
  browser: Browser;
  context: BrowserContext;
  step: (title: string, narration: string) => Promise<void>;
  hold: (ms?: number) => Promise<void>;
  waitForApp: () => Promise<void>;
  submitPrompt: (prompt: string) => Promise<void>;
  waitForChatIdle: () => Promise<void>;
  waitForAnyText: (texts: string[], timeoutMs?: number) => Promise<string>;
  close: () => Promise<string | null>;
}

function readOption(argv: string[], name: string): string | undefined {
  const prefixed = `--${name}=`;
  const inline = argv.find((arg) => arg.startsWith(prefixed));
  if (inline) return inline.slice(prefixed.length);

  const index = argv.findIndex((arg) => arg === `--${name}`);
  if (index >= 0) return argv[index + 1];

  return undefined;
}

function hasFlag(argv: string[], name: string): boolean {
  return argv.includes(`--${name}`);
}

export function parseVideoRuntimeOptions(argv: string[]): VideoRuntimeOptions {
  const mode = (readOption(argv, "mode") as VideoMode | undefined) ?? "guided";
  const headless = hasFlag(argv, "headless") || process.env.VIDEO_HEADLESS === "1";
  const slowMo = Number(readOption(argv, "slow-mo") ?? process.env.VIDEO_SLOW_MO ?? (mode === "guided" ? "250" : "100"));
  const timeoutMs = Number(readOption(argv, "timeout") ?? process.env.VIDEO_TIMEOUT_MS ?? "30000");

  return {
    baseUrl: (readOption(argv, "base-url") ?? process.env.VIDEO_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, ""),
    email: readOption(argv, "email") ?? process.env.VIDEO_EMAIL ?? process.env.VIDEO_DEMO_EMAIL ?? "",
    password:
      readOption(argv, "password") ?? process.env.VIDEO_PASSWORD ?? process.env.VIDEO_DEMO_PASSWORD ?? "",
    outputDir: path.resolve(readOption(argv, "output-dir") ?? process.env.VIDEO_OUTPUT_DIR ?? "artifacts/video"),
    headless,
    mode,
    slowMo: Number.isFinite(slowMo) ? slowMo : 100,
    timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : 30000,
  };
}

async function waitForBaseUrl(baseUrl: string, timeoutMs: number) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(baseUrl, { redirect: "manual" });
      if (response.status >= 200 && response.status < 500) {
        return;
      }
    } catch {
      // App still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Timed out waiting for ${baseUrl}. Start the app with "npm run dev" first.`);
}

export async function createVideoRuntime(options: VideoRuntimeOptions): Promise<VideoRuntime> {
  await mkdir(options.outputDir, { recursive: true });
  await waitForBaseUrl(options.baseUrl, options.timeoutMs);

  const browser = await chromium.launch({
    headless: options.headless,
    slowMo: options.slowMo,
  });

  const context = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    recordVideo: {
      dir: options.outputDir,
      size: { width: 1600, height: 900 },
    },
  });

  const page = await context.newPage();
  page.setDefaultTimeout(options.timeoutMs);

  const readline = createInterface({ input, output });
  let stepCount = 0;

  const step = async (title: string, narration: string) => {
    stepCount += 1;
    console.log(`\n[${stepCount}] ${title}`);
    console.log(narration);
    if (options.mode === "guided") {
      await readline.question("Press Enter to run this step...");
    }
  };

  const hold = async (ms = 1200) => {
    await page.waitForTimeout(ms);
  };

  const waitForApp = async () => {
    await page.waitForLoadState("networkidle");
  };

  const waitForChatIdle = async () => {
    try {
      await page.locator(".bb-loading-dot").first().waitFor({ state: "visible", timeout: 2500 });
    } catch {
      // Response may resolve before the loading indicator becomes visible.
    }

    await page.waitForFunction(() => !document.querySelector(".bb-loading-dot"), undefined, {
      timeout: options.timeoutMs,
    });
  };

  const waitForAnyText = async (texts: string[], timeoutMs = options.timeoutMs) => {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      for (const text of texts) {
        const isVisible = await page
          .getByText(text, { exact: false })
          .first()
          .isVisible()
          .catch(() => false);

        if (isVisible) {
          return text;
        }
      }

      await page.waitForTimeout(250);
    }

    throw new Error(`Timed out waiting for any of these texts: ${texts.join(" | ")}`);
  };

  const submitPrompt = async (prompt: string) => {
    const input = page.getByPlaceholder(
      "Ask about opportunities, search by name, or upload a doc to review..."
    );
    await input.fill(prompt);
    await input.press("Enter");
    await waitForChatIdle();
  };

  const video = page.video();

  const close = async () => {
    readline.close();
    await context.close();
    const videoPath = video ? await video.path() : null;
    await browser.close();
    return videoPath;
  };

  return {
    options,
    page,
    browser,
    context,
    step,
    hold,
    waitForApp,
    submitPrompt,
    waitForChatIdle,
    waitForAnyText,
    close,
  };
}
