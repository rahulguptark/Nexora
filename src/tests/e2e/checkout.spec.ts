import { test, expect } from "@playwright/test"

test.describe("Checkout Page Flow End-to-End Test", () => {
  
  test.beforeEach(async ({ page }) => {
    // 1. Simulate adding mock variant to cart before accessing checkout page
    await page.goto("/search")
    
    // Select first product card details
    const buyButton = page.locator("button:has-text('Add to Cart')").first()
    if (await buyButton.isVisible()) {
      await buyButton.click()
    }
  })

  test("should fill delivery addresses, select Stripe, and complete checkout", async ({ page }) => {
    // 1. Navigate to Cart page and proceed
    await page.goto("/cart")
    await expect(page.locator("h1")).toContainText("Shopping Cart")
    
    const checkoutLink = page.locator("a:has-text('Proceed to Checkout')")
    await expect(checkoutLink).toBeVisible()
    await checkoutLink.click()

    // 2. Assert checkout workspace page loaded
    await expect(page).toHaveURL(/\/checkout/)
    await expect(page.locator("h1")).toContainText("Secure Checkout")

    // 3. Populate address inputs
    await page.fill("input[name='email']", "customer_e2e@example.com")
    await page.fill("input[name='shippingName']", "John E2E Doe")
    await page.fill("input[name='shippingStreet']", "742 Evergreen Terrace")
    await page.fill("input[name='shippingCity']", "Springfield")
    await page.fill("input[name='shippingState']", "IL")
    await page.fill("input[name='shippingZip']", "62704")
    await page.fill("input[name='shippingPhone']", "+1 555-0199")

    // 4. Select delivery methods (Standard vs Express)
    await page.check("input[value='express']")

    // 5. Select payments channel (Mock Stripe inputs select)
    await page.check("input[value='stripe']")
    await page.fill("input[placeholder='Card Number']", "4242 4242 4242 4242")
    await page.fill("input[placeholder='MM / YY']", "12/28")
    await page.fill("input[placeholder='CVC']", "123")

    // 6. Submit checkout placement
    const submitButton = page.locator("button:has-text('Confirm and Place Order')")
    await expect(submitButton).toBeEnabled()
    await submitButton.click()

    // 7. Assert redirection to Order Confirmation and receipt generation
    await page.waitForURL(/\/checkout\/confirmation/)
    await expect(page.locator("h2")).toContainText("Order Placed Successfully!")
    
    // Check Invoice elements exist
    await expect(page.locator("h1")).toContainText("NEXORA LTD.")
    await expect(page.locator("button:has-text('Print Invoice')")).toBeVisible()
  })
})
