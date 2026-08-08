import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"

describe("Cart Integration & Merge Tests", () => {
  const mockUserId = "test-user-merge-id"
  const mockGuestCartId = "guest-cart-uuid"

  // Clean up database mock entries before integration testing
  beforeEach(async () => {
    try {
      await prisma.cartItem.deleteMany({
        where: {
          cart: {
            OR: [
              { userId: mockUserId },
              { id: mockGuestCartId },
            ]
          }
        }
      })
      await prisma.cart.deleteMany({
        where: {
          OR: [
            { userId: mockUserId },
            { id: mockGuestCartId },
          ]
        }
      })
    } catch (e) {
      // ignore clean errors if tables do not contain mocks yet
    }
  })

  it("should merge guest cart items with user cart items", async () => {
    // 1. Setup mock product variant
    const variant = await prisma.productVariant.findFirst()
    if (!variant) {
      console.warn("Skipping integration test: No product variants found in database.")
      return
    }

    // 2. Create User Cart with 1 item (quantity 1)
    const userCart = await prisma.cart.create({
      data: {
        userId: mockUserId,
        items: {
          create: {
            productVariantId: variant.id,
            quantity: 1,
          }
        }
      },
      include: { items: true }
    })

    // 3. Create Guest Cart with 1 item of the same variant (quantity 2)
    const guestCart = await prisma.cart.create({
      data: {
        id: mockGuestCartId,
        items: {
          create: {
            productVariantId: variant.id,
            quantity: 2,
          }
        }
      },
      include: { items: true }
    })

    // 4. Execute Merge Operation (Transactional simulated logic)
    const mergedItems = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Fetch guest items
      const guestItems = await tx.cartItem.findMany({
        where: { cartId: mockGuestCartId },
      })

      // Fetch user items
      const userItems = await tx.cartItem.findMany({
        where: { cartId: userCart.id },
      })

      for (const gItem of guestItems) {
        const matchingUserItem = userItems.find(
          uItem => uItem.productVariantId === gItem.productVariantId
        )

        if (matchingUserItem) {
          // Increment quantity
          await tx.cartItem.update({
            where: { id: matchingUserItem.id },
            data: { quantity: matchingUserItem.quantity + gItem.quantity },
          })
        } else {
          // Relink to user cart
          await tx.cartItem.update({
            where: { id: gItem.id },
            data: { cartId: userCart.id },
          })
        }
      }

      // Delete guest cart container
      await tx.cart.delete({ where: { id: mockGuestCartId } })

      // Fetch final user cart items
      return tx.cartItem.findMany({
        where: { cartId: userCart.id },
      })
    })

    // 5. Assertions
    expect(mergedItems.length).toBe(1)
    expect(mergedItems[0].quantity).toBe(3) // 1 user + 2 guest = 3
  })
})
