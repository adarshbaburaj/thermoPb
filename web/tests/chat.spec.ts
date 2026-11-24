import { test, expect, type Page } from "@playwright/test";

const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page, request }) => {
  const observed: string[] = [];
  errors.set(page, observed);
  page.on("pageerror", (error) => observed.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") observed.push(message.text());
  });
  await request.post("/api/demo/reset");
});
test.afterEach(async ({ page }) => {
  expect(errors.get(page) || []).toEqual([]);
});
const view = (page: Page) =>
  page.getByRole("navigation", { name: "Workspace view", exact: true });

test("chat is home, shows thinking, deep-links to evidence, and preserves the conversation", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Who would you like to meet?" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Send message", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".welcome-mark img")).toHaveAttribute(
    "src",
    "/branding/thermopb-logo.png",
  );
  await expect(page.locator(".welcome-mark img")).toBeVisible();
  expect(
    await page
      .locator(".welcome-mark img")
      .evaluate(
        (image) =>
          (image as HTMLImageElement).complete &&
          (image as HTMLImageElement).naturalWidth > 0,
      ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/thermopb-chat-home.png",
    fullPage: true,
    animations: "disabled",
  });
  await page
    .getByRole("button", {
      name: "Who can introduce me to Maya Chen?",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Thinking with your network", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Look inside Glass Brain", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your network brain." }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Graph target" }),
  ).toHaveValue("person-maya-chen");
  await view(page).getByRole("button", { name: "Chat", exact: true }).click();
  await expect(page.locator(".message-assistant")).toContainText(
    "Start with Ravi Shah",
  );
  await expect(page.locator(".chat-mini-person")).toHaveCount(4);
  await page
    .locator(".chat-route-card")
    .getByRole("button", { name: "View evidence", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Source record");
  await page.keyboard.press("Escape");
  await page.screenshot({
    path: "test-results/thermopb-chat-answer.png",
    fullPage: true,
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "Explore in Glass Brain", exact: false })
    .click();
  await expect(page.getByText("3 hops away", { exact: true })).toBeVisible();
  await view(page)
    .getByRole("button", { name: "Dashboard", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your network, at a glance." }),
  ).toBeVisible();
  await expect(page.locator(".connector-row")).toHaveCount(5);
  await page
    .getByRole("textbox", { name: "Search connectors", exact: true })
    .fill("Ravi");
  await expect(page.locator(".connector-row")).toHaveCount(1);
  await expect(page.locator(".connector-row")).toContainText("Ravi Shah");
  await page.screenshot({
    path: "test-results/thermopb-connector-dashboard.png",
    fullPage: true,
    animations: "disabled",
  });
  await page
    .locator(".connector-row")
    .getByRole("button", { name: "Explore routes", exact: true })
    .click();
  await expect(
    page.getByRole("main", { name: "Glass Brain", exact: true }),
  ).toBeVisible();
  await view(page).getByRole("button", { name: "Chat", exact: true }).click();
  await expect(page.locator(".message-assistant")).toContainText(
    "Start with Ravi Shah",
  );
});

test("chat responds to rooms, creative outreach, and TM tags; a response can be stopped", async ({
  page,
}) => {
  await page.goto("/");
  const message = page.getByRole("textbox", {
    name: "Message thermopb",
    exact: true,
  });
  await message.fill("Which room should I be in?");
  await message.press("Enter");
  await expect(page.locator(".chat-event-card")).toContainText(
    "The Platform Engineering Salon",
  );
  await message.fill("Find a creative way to reach out");
  await message.press("Enter");
  await expect(page.locator(".chat-ideas-card")).toBeVisible();
  await message.fill("What is my Thermo ID?");
  await message.press("Enter");
  await expect(page.locator(".chat-id-card")).toContainText("TM-ADARSH");
  await message.fill("Who can introduce me to Maya?");
  await message.press("Enter");
  await page
    .getByRole("button", { name: "Stop response", exact: true })
    .click();
  await expect(page.locator(".chat-thinking")).toHaveCount(0);
  await message.fill("Who can introduce me to Sofia Ramirez?");
  await message.press("Enter");
  await expect(page.locator(".message-assistant").last()).toContainText(
    "Sofia Ramirez",
  );
  await expect(page.locator(".message-assistant")).toHaveCount(4);
  await page
    .getByRole("button", { name: "New conversation", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Who would you like to meet?" }),
  ).toBeVisible();
  await expect(page.locator(".chat-message")).toHaveCount(0);
});

test("chat and dashboard fit mobile, including reduced motion and a visible composer", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const composer = page.getByRole("textbox", {
    name: "Message thermopb",
    exact: true,
  });
  await expect(composer).toBeVisible();
  expect(
    await composer.evaluate(
      (element) => element.getBoundingClientRect().bottom,
    ),
  ).toBeLessThanOrEqual(844);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await composer.fill("Who can introduce me to Maya Chen?");
  await composer.press("Enter");
  await expect(page.locator(".thinking-indicator")).toBeVisible();
  expect(
    await page
      .locator(".thinking-indicator")
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe("none");
  await expect(page.locator(".chat-route-card")).toBeVisible();
  await page.screenshot({
    path: "test-results/thermopb-chat-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await view(page)
    .getByRole("button", { name: "Dashboard", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Search connectors", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});

test("navigation dock stays centered at the bottom and clear of the composer", async ({
  page,
  request,
}) => {
  const logo = await request.get("/branding/thermopb-logo.png");
  expect(logo.ok()).toBe(true);
  expect(logo.headers()["content-type"]).toContain("image/png");
  await page.goto("/");
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const dock = page.getByRole("complementary", {
      name: "Navigation dock",
      exact: true,
    });
    await expect(dock).toBeVisible();
    const rect = await dock.boundingBox();
    expect(Math.abs(rect!.x + rect!.width / 2 - width / 2)).toBeLessThan(2);
    expect(900 - rect!.y - rect!.height).toBeLessThanOrEqual(20);
    expect(rect!.height).toBeLessThan(80);
    const composer = await page.locator(".chat-composer").boundingBox();
    expect(composer!.y + composer!.height).toBeLessThan(rect!.y);
    await dock
      .getByRole("navigation", { name: "Workspace", exact: true })
      .getByRole("button", { name: "Network brain", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Your network brain." }),
    ).toBeVisible();
    await page
      .getByRole("navigation", { name: "Workspace view", exact: true })
      .getByRole("button", { name: "Chat", exact: true })
      .click();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
  }
});
