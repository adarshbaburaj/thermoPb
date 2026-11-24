import { test, expect, type Page } from "@playwright/test";

async function openWorkspace(page: Page) {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Workspace", exact: true })
    .getByRole("button", { name: /^(Glass Brain|Network brain)$/ })
    .click();
}

const browserErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ request, page }, testInfo) => {
  // Every test except the simple-mode one exercises the full workspace.
  if (!testInfo.title.startsWith("simple mode"))
    await page.addInitScript(() =>
      localStorage.setItem("thermopb:mode", "advanced"),
    );
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await request.post("/api/demo/reset");
});

test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page) || []).toEqual([]);
});

test("seven screens, sourced graph, intake, capture and review gate", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await openWorkspace(page);
  await expect(page).toHaveTitle(/thermopb/);
  await expect(page.getByText("Connected", { exact: true })).toBeVisible();
  await expect(page.getByText("3 hops away", { exact: true })).toBeVisible();
  await page.screenshot({
    path: "test-results/thermopb-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "Sourced, view evidence" })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toContainText("Source record");
  await page.getByRole("button", { name: "Close evidence" }).click();
  await page.getByRole("button", { name: "Intake", exact: true }).click();
  await page.getByRole("button", { name: "Build my ICP", exact: true }).click();
  await expect(
    page.getByText("Developer platforms & SaaS", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Discover my people" }).click();
  await page.getByRole("button", { name: "Find leads", exact: true }).click();
  await expect(page.getByRole("row")).toHaveCount(21);
  await page.getByRole("textbox", { name: "Search leads" }).fill("Kindred");
  await expect(page.getByRole("row")).toHaveCount(2);
  await page.getByRole("button", { name: "My network", exact: true }).click();
  await page.getByRole("button", { name: "Use Priya Nair" }).click();
  await expect(page.getByLabel("Public profile URL")).toHaveValue(
    "https://example.com/in/priya-nair",
  );
  await page
    .getByRole("button", { name: "Capture connection", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Unlock score" }),
  ).toBeVisible();
  await expect(page.locator(".unlock-number")).toHaveText(/^[0-3]$/);
  await page.getByRole("button", { name: "Event radar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "The Platform Engineering Salon" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Add to calendar" }).first(),
  ).toHaveAttribute("href", /calendar/);
  await page.getByRole("button", { name: /Routes & queue/ }).click();
  await page
    .getByRole("button", { name: "Prepare a draft", exact: true })
    .click();
  await expect(page.getByLabel(/Subject:/)).toBeVisible();
  const original = await page.getByLabel(/Subject:/).inputValue();
  await page
    .getByLabel(/Subject:/)
    .fill(original + " Your team doubled revenue last quarter.");
  await expect(
    page.getByRole("button", { name: "Approve request", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Review draft", exact: true }).click();
  await expect(
    page.getByText(/Needs a source: Your team doubled revenue/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Approve request", exact: true }),
  ).toBeDisabled();
  await page.getByLabel(/Subject:/).fill(original);
  await page.getByRole("button", { name: "Review draft", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Approve request", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Approve request", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Queued", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Pipeline", exact: true }).click();
  await expect(page.locator(".kanban")).toBeVisible();
  await expect(page.locator(".pipeline-card")).toHaveCount(20);
  expect(errors).toEqual([]);
});

test("mobile layout, navigation, and dialogs stay within viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openWorkspace(page);
  await expect(page.getByText("Connected", { exact: true })).toBeVisible();
  await expect(page.getByText("3 hops away", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Good things happen through people." }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/thermopb-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Used for lookups");
  await page.getByRole("button", { name: "Close settings" }).click();
  await page.getByRole("button", { name: "Discovery", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "The right people. A real reason." }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});

test("Thermo ID creates a connection popup and outreach ideas can be saved and applied", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await openWorkspace(page);
  await page.getByRole("button", { name: "My network", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your people. One TM tag." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "TM-PRIYA", exact: false }).click();
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await expect(page.getByText("Their reply")).toBeVisible();
  await expect(
    page.getByText("Priya Nair knows Maya Chen.", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Accepted", exact: true }).click();
  await expect(page.locator(".connection-popup")).toContainText(
    "Priya Nair knows Maya Chen.",
  );
  await page.screenshot({
    path: "test-results/thermopb-thermo-id.png",
    fullPage: true,
    animations: "disabled",
  });
  await page
    .locator(".connection-popup")
    .getByRole("button", { name: "Ask for an introduction" })
    .click();
  await expect(
    page.getByRole("heading", { name: "A thoughtful way in." }),
  ).toBeVisible();
  await expect(page.locator(".route-option").first()).toContainText("Priya");
  await page
    .getByRole("button", { name: "Outreach ideas", exact: true })
    .click();
  await expect(page.locator(".idea-card")).toHaveCount(4);
  await page.getByRole("button", { name: "Run lookout", exact: true }).click();
  await expect(page.locator(".idea-card")).toHaveCount(6);
  await page
    .locator(".idea-card")
    .first()
    .getByRole("button", { name: /Save / })
    .click();
  await page.getByRole("button", { name: /^Saved/ }).click();
  await expect(page.locator(".idea-card")).toHaveCount(1);
  await page
    .locator(".idea-card")
    .first()
    .getByRole("button", { name: "View post" })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Post by");
  await page.getByRole("button", { name: "Close evidence" }).click();
  await page.getByRole("button", { name: "All ideas", exact: true }).click();
  await page.screenshot({
    path: "test-results/thermopb-outreach-ideas.png",
    fullPage: true,
    animations: "disabled",
  });
  await page
    .locator(".idea-card")
    .first()
    .getByRole("button", { name: "Try this approach" })
    .click();
  await expect(page.locator(".selected-technique")).toContainText(
    "Approach to try:",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "My network", exact: true }).click();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: "test-results/thermopb-thermo-id-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "Outreach ideas", exact: true })
    .click();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  expect(errors).toEqual([]);
});

test("all screens fit phone and tablet layouts with reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const screens = [
    "Intake",
    "Discovery",
    "Glass Brain",
    "My network",
    "Event radar",
    "Routes & queue",
    "Outreach ideas",
    "Pipeline",
  ];
  await openWorkspace(page);
  await expect(page.locator(".path-line").first()).toBeVisible();
  expect(
    await page
      .locator(".path-line")
      .first()
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
  for (const width of [390, 768]) {
    await page.setViewportSize({ width, height: 1024 });
    for (const screen of screens) {
      await page.getByRole("button", { name: screen, exact: true }).click();
      await expect(page.getByRole("main", { name: screen })).toBeVisible();
      expect(
        await page
          .getByRole("main")
          .evaluate((el) => getComputedStyle(el).animationName),
      ).toBe("none");
      const overflow = await page.evaluate(() =>
        [...document.querySelectorAll("main > *, .pipeline-bottom > *")]
          .filter((el) => el.getBoundingClientRect().right > innerWidth + 1)
          .slice(0, 8)
          .map(
            (el) =>
              `${el.tagName}.${el.className}: ${Math.round(el.getBoundingClientRect().width)}`,
          ),
      );
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
        `${screen} at ${width}px: ${overflow.join(", ")}`,
      ).toBeLessThanOrEqual(width);
    }
  }
});

test("keyboard graph exploration and stale target responses stay correct", async ({
  page,
}) => {
  await openWorkspace(page);
  await expect(page.locator(".path-line").first()).toBeVisible();
  await page
    .getByRole("button", { name: "Explore Ravi Shah", exact: true })
    .focus();
  await page.keyboard.press("Space");
  await expect(page.getByRole("dialog")).toContainText("Source record");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const selector = page.getByRole("combobox", { name: "Graph target" });
  await page.route("**/api/paths/person-sofia-ramirez", async (route) => {
    const response = await route.fetch();
    await new Promise((resolve) => setTimeout(resolve, 300));
    await route.fulfill({ response });
  });
  await selector.selectOption("person-sofia-ramirez");
  await selector.selectOption("person-james-okafor");
  await expect(page.locator(".target-identity h2")).toHaveText("James Okafor");
  await expect(page.locator(".hop").last()).toContainText("James Okafor");
  await expect(
    page.getByRole("button", { name: "Explore James Okafor", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("simple mode shows only the network brain and TM tag, and switches to advanced", async ({
  page,
}) => {
  await openWorkspace(page);
  await expect(
    page.getByRole("heading", { name: "Your network brain." }),
  ).toBeVisible();
  await expect(page.getByText("3 hops away", { exact: true })).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Workspace", exact: true });
  await expect(nav.getByRole("button")).toHaveCount(3);
  await expect(page.locator(".metric-strip")).toHaveCount(0);
  await expect(page.locator(".thinking-bar")).toHaveCount(0);
  await page.getByRole("button", { name: "TM tag", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your TM tag." }),
  ).toBeVisible();
  await expect(page.locator(".thermo-id").getByText("TM-ADARSH")).toBeVisible();
  await expect(page.getByText("Grow your personal graph")).toHaveCount(0);
  await page.getByRole("button", { name: "Advanced", exact: true }).click();
  await expect(nav.getByRole("button")).toHaveCount(10);
  await expect(
    page.getByRole("heading", { name: "Small world. Bigger possibilities." }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("navigation", { name: "Workspace", exact: true })
    .getByRole("button", { name: "Glass Brain", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Advanced", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Simple", exact: true }).click();
  await expect(nav.getByRole("button")).toHaveCount(3);
  const body = (await page.locator("body").innerText()).toLowerCase();
  expect(body).not.toContain("demo");
  expect(body).not.toContain("fictional");
});

test("simple mode: the big switch jumps to creative outreach and an idea opens in the draft studio", async ({
  page,
}) => {
  await openWorkspace(page);
  await page
    .getByRole("button", { name: "Do creative outreach", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Do creative outreach." }),
  ).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Workspace", exact: true });
  await expect(nav.getByRole("button")).toHaveCount(3);
  await page
    .locator(".idea-card")
    .first()
    .getByRole("button", { name: "Try this approach" })
    .click();
  await expect(page.locator(".selected-technique")).toContainText(
    "Approach to try:",
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Creative ideas", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Do creative outreach", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Simple", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your network brain." }),
  ).toBeVisible();
});
