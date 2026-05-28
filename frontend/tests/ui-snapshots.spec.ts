import { expect, test } from "@playwright/test";

const tabs = ["Approvals", "CS Queue", "Knowledge Base", "Marketing Intel"];

test("workspace tabs render without horizontal overflow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("SignalDesk").first()).toBeVisible();

  for (const tab of tabs) {
    await page.getByRole("button", { name: tab }).click();
    await page.waitForTimeout(250);

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth + 2);
  }
});

test("core workbench surfaces visible in default view", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Customer Chat" })).toBeVisible();
  await expect(page.getByText("Ask BOLDR support intelligence anything.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send" })).toBeVisible();
});
