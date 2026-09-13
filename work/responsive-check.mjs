import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const errors = [];

for (const viewport of [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "tablet", width: 900, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
]) {
  const page = await browser.newPage({ viewport });
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`${viewport.name}: ${message.text()}`);
  });
  await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
  await page.screenshot({ path: `work/responsive-${viewport.name}.png`, fullPage: true });

  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    bodyWidth: document.body.scrollWidth,
    navPosition: getComputedStyle(document.querySelector(".bottom-nav")).position,
    navWidth: document.querySelector(".bottom-nav").getBoundingClientRect().width,
  }));
  if (dimensions.bodyWidth > dimensions.viewport + 1) {
    throw new Error(`${viewport.name} has horizontal overflow: ${dimensions.bodyWidth} > ${dimensions.viewport}`);
  }

  if (viewport.name === "desktop") {
    await page.getByRole("button", { name: "Plan", exact: true }).click();
    await page.getByRole("button", { name: "Checklist", exact: true }).click();
    await page.getByRole("tablist").getByRole("button", { name: "Progress", exact: true }).click();
    await page.getByRole("button", { name: "Journal", exact: true }).click();
    await page.getByRole("button", { name: "Quotes", exact: true }).click();
  }

  console.log(viewport.name, dimensions);
  await page.close();
}

await browser.close();
if (errors.length) throw new Error(`Console errors:\n${errors.join("\n")}`);
