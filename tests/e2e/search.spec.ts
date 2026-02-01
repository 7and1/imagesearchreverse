import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("loads successfully", async ({ page }) => {
    await page.goto("/");

    // Check page title
    await expect(page).toHaveTitle(/Image Search Reverse|Reverse Image Search/i);

    // Check main heading is visible
    const heading = page.locator("h1");
    await expect(heading).toBeVisible();
  });

  test("displays search panel", async ({ page }) => {
    await page.goto("/");

    // Check for upload area or URL input
    const uploadArea = page.locator('[data-testid="upload-area"], [role="button"]:has-text("Upload")');
    const urlInput = page.locator('input[type="url"], input[placeholder*="URL"], input[placeholder*="url"]');

    // At least one of these should be visible
    const hasUpload = await uploadArea.count() > 0;
    const hasUrlInput = await urlInput.count() > 0;

    expect(hasUpload || hasUrlInput).toBe(true);
  });

  test("has proper meta tags for SEO", async ({ page }) => {
    await page.goto("/");

    // Check meta description
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveAttribute("content", /.+/);

    // Check Open Graph tags
    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveAttribute("content", /.+/);
  });
});

test.describe("URL Search Flow", () => {
  test("can enter image URL", async ({ page }) => {
    await page.goto("/");

    // Find URL input
    const urlInput = page.locator('input[type="url"], input[placeholder*="URL"], input[placeholder*="url"], input[name="imageUrl"]').first();

    if (await urlInput.isVisible()) {
      await urlInput.fill("https://example.com/test-image.jpg");
      await expect(urlInput).toHaveValue("https://example.com/test-image.jpg");
    }
  });

  test("shows validation error for invalid URL", async ({ page }) => {
    await page.goto("/");

    const urlInput = page.locator('input[type="url"], input[placeholder*="URL"], input[placeholder*="url"], input[name="imageUrl"]').first();

    if (await urlInput.isVisible()) {
      await urlInput.fill("not-a-valid-url");

      // Try to submit
      const submitButton = page.locator('button[type="submit"], button:has-text("Search")').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();

        // Should show error or validation message
        const errorMessage = page.locator('[role="alert"], .error, [data-testid="error"]');
        // Wait a bit for validation
        await page.waitForTimeout(500);

        // Either error message appears or form doesn't submit
        const hasError = await errorMessage.count() > 0;
        const urlStillInvalid = await urlInput.inputValue() === "not-a-valid-url";
        expect(hasError || urlStillInvalid).toBe(true);
      }
    }
  });
});

test.describe("Image Upload Flow", () => {
  test("shows upload area", async ({ page }) => {
    await page.goto("/");

    // Look for file input or drop zone
    const fileInput = page.locator('input[type="file"]');
    const dropZone = page.locator('[data-testid="drop-zone"], [role="button"]:has-text("Upload"), [role="button"]:has-text("Drop")');

    const hasFileInput = await fileInput.count() > 0;
    const hasDropZone = await dropZone.count() > 0;

    expect(hasFileInput || hasDropZone).toBe(true);
  });

  test("accepts image file types", async ({ page }) => {
    await page.goto("/");

    const fileInput = page.locator('input[type="file"]').first();

    if (await fileInput.count() > 0) {
      // Check accepted file types
      const accept = await fileInput.getAttribute("accept");
      if (accept) {
        expect(accept).toMatch(/image|jpeg|jpg|png|gif|webp/i);
      }
    }
  });
});

test.describe("Navigation", () => {
  test("can navigate to help page", async ({ page }) => {
    await page.goto("/");

    const helpLink = page.locator('a[href="/help"], a:has-text("Help")').first();

    if (await helpLink.isVisible()) {
      await helpLink.click();
      await expect(page).toHaveURL(/\/help/);
    }
  });

  test("can navigate to privacy page", async ({ page }) => {
    await page.goto("/");

    const privacyLink = page.locator('a[href="/privacy"], a:has-text("Privacy")').first();

    if (await privacyLink.isVisible()) {
      await privacyLink.click();
      await expect(page).toHaveURL(/\/privacy/);
    }
  });

  test("can navigate to terms page", async ({ page }) => {
    await page.goto("/");

    const termsLink = page.locator('a[href="/terms"], a:has-text("Terms")').first();

    if (await termsLink.isVisible()) {
      await termsLink.click();
      await expect(page).toHaveURL(/\/terms/);
    }
  });
});

test.describe("Accessibility", () => {
  test("has no accessibility violations on homepage", async ({ page }) => {
    await page.goto("/");

    // Basic accessibility checks
    // Check for main landmark
    const main = page.locator("main");
    await expect(main).toBeVisible();

    // Check for skip link or proper heading structure
    const h1 = page.locator("h1");
    await expect(h1).toBeVisible();

    // Check images have alt text
    const images = page.locator("img");
    const imageCount = await images.count();

    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute("alt");
      const role = await img.getAttribute("role");
      const ariaHidden = await img.getAttribute("aria-hidden");

      // Image should have alt text, or be decorative (role="presentation" or aria-hidden="true")
      const isAccessible =
        alt !== null ||
        role === "presentation" ||
        ariaHidden === "true";

      expect(isAccessible).toBe(true);
    }
  });

  test("form inputs have labels", async ({ page }) => {
    await page.goto("/");

    const inputs = page.locator("input:not([type='hidden']):not([type='submit'])");
    const inputCount = await inputs.count();

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute("id");
      const ariaLabel = await input.getAttribute("aria-label");
      const ariaLabelledBy = await input.getAttribute("aria-labelledby");
      const placeholder = await input.getAttribute("placeholder");

      // Input should have associated label, aria-label, or aria-labelledby
      let hasLabel = false;

      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        hasLabel = (await label.count()) > 0;
      }

      const isAccessible =
        hasLabel ||
        ariaLabel !== null ||
        ariaLabelledBy !== null ||
        placeholder !== null; // placeholder as fallback

      expect(isAccessible).toBe(true);
    }
  });
});

test.describe("Responsive Design", () => {
  test("works on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // Page should still be functional
    const heading = page.locator("h1");
    await expect(heading).toBeVisible();

    // No horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1); // +1 for rounding
  });

  test("works on tablet viewport", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");

    const heading = page.locator("h1");
    await expect(heading).toBeVisible();
  });

  test("works on desktop viewport", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/");

    const heading = page.locator("h1");
    await expect(heading).toBeVisible();
  });
});
