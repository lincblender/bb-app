import type { Page } from "@playwright/test";

export const selectors = {
  signInEmail: (page: Page) => page.locator("#email"),
  signInPassword: (page: Page) => page.locator("#password"),
  signInSubmit: (page: Page) => page.getByRole("button", { name: /^sign in$/i }),
  signInError: (page: Page) => page.locator("p.bb-text-error"),
  newChatButton: (page: Page) => page.getByRole("button", { name: /^new$/i }),
  promptInput: (page: Page) =>
    page.getByPlaceholder("Ask about opportunities, search by name, or upload a doc to review..."),
  addFileButton: (page: Page) => page.getByLabel("Add file"),
  chatOptionsButton: (page: Page) => page.getByTitle("Chat options"),
  startSwotButton: (page: Page) => page.getByRole("button", { name: /start swot/i }),
  detailSearchInput: (page: Page) => page.getByPlaceholder("Search opportunities…"),
  detailChatButton: (page: Page) => page.getByTitle("Chat about this opportunity"),
  firstOpportunityChatButton: (page: Page) => page.getByTitle("Chat about this opportunity").first(),
  loadingDots: (page: Page) => page.locator(".bb-loading-dot"),
  hiddenFileInput: (page: Page) => page.locator('input[type="file"]'),
};
