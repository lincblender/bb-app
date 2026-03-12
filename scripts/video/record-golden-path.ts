import path from "node:path";
import { fileURLToPath } from "node:url";
import { videoFlows } from "./flows";
import { createVideoRuntime, parseVideoRuntimeOptions } from "./runtime";
import { selectors } from "./selectors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FLOW_ID = "console-golden-path";
const SAMPLE_BRIEF_PATH = path.resolve(__dirname, "fixtures/golden-path-brief.md");

async function main() {
  const options = parseVideoRuntimeOptions(process.argv.slice(2));
  const runtime = await createVideoRuntime(options);
  const { page } = runtime;
  const flow = videoFlows.find((candidate) => candidate.id === FLOW_ID);

  if (!flow) {
    throw new Error(`Missing flow manifest entry for ${FLOW_ID}`);
  }

  try {
    console.log(`Recording flow: ${flow.title}`);
    console.log(`Base URL: ${options.baseUrl}`);
    console.log(`Mode: ${options.mode}`);

    await runtime.step(
      "Sign in",
      "Start with a real workspace account so the walkthrough opens on live data instead of a canned shell."
    );
    await page.goto(`${options.baseUrl}/auth/signin`, { waitUntil: "domcontentloaded" });
    await selectors.signInEmail(page).fill(options.email);
    await selectors.signInPassword(page).fill(options.password);
    await selectors.signInSubmit(page).click();
    const authResult = await Promise.race([
      page
        .waitForURL(/\/console\/(dashboard|get-started)/, { timeout: options.timeoutMs })
        .then(() => "ok" as const),
      selectors.signInError(page)
        .waitFor({ state: "visible", timeout: options.timeoutMs })
        .then(() => "error" as const),
    ]);
    if (authResult === "error") {
      const errorText = (await selectors.signInError(page).textContent())?.trim() ?? "Unknown sign-in error.";
      throw new Error(
        `Sign-in failed for ${options.email}: ${errorText} Set VIDEO_EMAIL/VIDEO_PASSWORD (or --email/--password) to a valid local account.`
      );
    }
    if (!page.url().includes("/console/dashboard")) {
      await page.goto(`${options.baseUrl}/console/dashboard`, { waitUntil: "domcontentloaded" });
    }
    await selectors.newChatButton(page).waitFor({ state: "visible" });
    await runtime.hold(1200);

    await runtime.step(
      "Open a clean chat",
      "Reset to a fresh thread so the recording starts from a clean qualification path, even if the workspace already has older chats."
    );
    await selectors.newChatButton(page).click();
    await selectors.promptInput(page).waitFor({ state: "visible" });
    await runtime.hold(800);

    await runtime.step(
      "Ask for matching bids",
      "This prompt should resolve from tenant data first. It proves the product can find real opportunities without hand-waving."
    );
    await runtime.submitPrompt("What's the latest matching bids with my capabilities?");
    await runtime.waitForAnyText([
      "Here are the latest matching opportunities currently in your workspace:",
      "Break apart",
    ]);
    await runtime.hold(1800);

    await runtime.step(
      "Focus one opportunity",
      "Now turn the broad result set into a single qualification thread around the Whole-of-Government Cloud Framework."
    );
    await selectors.firstOpportunityChatButton(page).click();
    await runtime.waitForAnyText([
      "Whole-of-Government Cloud Framework",
      "selected it in the details panel",
    ]);
    await selectors.startSwotButton(page).waitFor({ state: "visible" });
    await runtime.hold(1400);

    await runtime.step(
      "Run SWOT from context",
      "Once an opportunity is in context, the network panel already holds the shape of the SWOT. This is faster and more defensible than starting from a blank prompt."
    );
    await selectors.startSwotButton(page).click();
    await runtime.waitForAnyText([
      "SWOT from your context panel",
      "SWOT analysis",
    ]);
    await runtime.hold(1800);

    await runtime.step(
      "Ask competitor impact",
      "This is the higher-value strategy move: not just fit, but what competitor behavior does to our position and what action to take next."
    );
    await runtime.submitPrompt(
      "What's the competitor impact on our Whole-of-Government Cloud Framework tender?"
    );
    await runtime.waitForAnyText([
      "Impact assessment",
      "Recommendation",
    ]);
    await runtime.hold(1800);

    await runtime.step(
      "Open the full opportunity detail page",
      "Chat is the fast front door. The detail page is where the score breakdown, issuer context, and next actions become easy to inspect on screen."
    );
    await page.goto(`${options.baseUrl}/console/opportunities/opp-1`, { waitUntil: "domcontentloaded" });
    await runtime.waitForAnyText([
      "Whole-of-Government Cloud Framework",
      "Score Breakdown",
    ]);
    await page.mouse.wheel(0, 500);
    await runtime.hold(1800);

    await runtime.step(
      "Return to chat for document review",
      "The final process is document review. I want to show extraction first, then the review response, while staying honest about what the system actually analysed."
    );
    await selectors.detailChatButton(page).click();
    await page.waitForURL(/\/console\/dashboard/);
    await selectors.promptInput(page).waitFor({ state: "visible" });
    await runtime.hold(1200);

    await runtime.step(
      "Upload a sample brief and run review",
      "If live AI analysis is configured, this can produce a fuller review. If not, the flow still demonstrates extraction and the explicit fallback guardrail."
    );
    const chooserPromise = page.waitForEvent("filechooser");
    await selectors.addFileButton(page).click();
    const chooser = await chooserPromise;
    await chooser.setFiles(SAMPLE_BRIEF_PATH);
    await page.getByText("golden-path-brief.md", { exact: false }).waitFor({ state: "visible" });
    await page.getByText("ready", { exact: false }).waitFor({ state: "visible" });
    await runtime.hold(1200);
    await runtime.submitPrompt("Review this doc against my last few bids - is it worth bidding?");
    await runtime.waitForAnyText([
      "I extracted document text, but the AI analysis step was unavailable.",
      "Extracted documents:",
      "Here is how it stacks up against your last few bids and capabilities:",
      "Here's how it stacks up against your last few bids and capabilities:",
    ]);
    await runtime.hold(2200);

    const videoPath = await runtime.close();
    console.log("");
    console.log("Capture complete.");
    if (videoPath) {
      console.log(`Video saved to ${videoPath}`);
    }
    console.log(`Narration script: ${path.resolve(__dirname, "narration/golden-path.md")}`);
  } catch (error) {
    const videoPath = await runtime.close();
    if (videoPath) {
      console.log(`Partial capture saved to ${videoPath}`);
    }
    throw error;
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
