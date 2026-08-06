# Nexora REST API Specification

This document provides a comprehensive API reference for the Nexora e-commerce backend platform, covering request payload formats, query parameters, authorization scopes, and successful JSON responses.

---

## 1. Authentication & Session Management

### 1.1 User Registration
*   **Endpoint**: `POST /api/auth/register`
*   **Authentication**: None
*   **Payload (JSON)**:
    ```json
    {
      "email": "user@example.com",
      "password": "securepassword123",
      "firstName": "John",
      "lastName": "Doe",
      "phoneNumber": "+1234567890" // Optional
    }
    ```
*   **Response (201 Created)**:
    ```json
    {
      "message": "User registered successfully. Verification email simulated.",
      "user": {
        "id": "user-uuid",
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "status": "pending_verification"
      }
    }
    ```

### 1.2 User Login
*   **Endpoint**: `POST /api/auth/login`
*   **Authentication**: None
*   **Payload (JSON)**:
    ```json
    {
      "email": "user@example.com",
      "password": "securepassword123",
      "code": "123456", // Optional, required only if MFA is enabled
      "rememberMe": true // Optional, defaults to false
    }
    ```
*   **Response (200 OK - Standard)**:
    *   *Sets Cookies: `access_token` (expires in 15m), `refresh_token` (expires in 30d or 24h).*
    ```json
    {
      "success": true,
      "message": "Login successful",
      "user": {
        "id": "user-uuid",
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "roles": ["customer"],
        "isMfaEnabled": false
      }
    }
    ```
*   **Response (200 OK - MFA Required Prompt)**:
    ```json
    {
      "mfaRequired": true,
      "userId": "user-uuid",
      "message": "Multi-factor authentication required"
    }
    ```

### 1.3 OTP Authentication Request
*   **Endpoint**: `POST /api/auth/otp/request`
*   **Authentication**: None (Requires account status to be `active`)
*   **Payload (JSON)**:
    ```json
    {
      "email": "user@example.com"
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "message": "One-Time Password code simulated and sent."
    }
    ```

### 1.4 OTP Authentication Verification
*   **Endpoint**: `POST /api/auth/otp/verify`
*   **Authentication**: None
*   **Payload (JSON)**:
    ```json
    {
      "email": "user@example.com",
      "code": "654321",
      "rememberMe": false // Optional
    }
    ```
*   **Response (200 OK)**:
    *   *Sets Cookies: `access_token`, `refresh_token`.*
    ```json
    {
      "success": true,
      "user": {
        "id": "user-uuid",
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "roles": ["customer"]
      }
    }
    ```

### 1.5 Session Refresh
*   **Endpoint**: `POST /api/auth/refresh`
*   **Authentication**: Implicit (Reads cookie `refresh_token`)
*   **Response (200 OK)**:
    *   *Updates Cookie: `access_token`.*
    ```json
    {
      "success": true,
      "message": "Access token refreshed successfully"
    }
    ```

### 1.6 User Logout
*   **Endpoint**: `POST /api/auth/logout`
*   **Authentication**: Implicit (Reads cookies `access_token` and `refresh_token`)
*   **Response (200 OK)**:
    *   *Expires/clears cookies, updates session record in DB to `isRevoked: true`.*
    ```json
    {
      "success": true,
      "message": "Logged out successfully"
    }
    ```

### 1.7 Google OAuth Redirect
*   **Endpoint**: `GET /api/auth/google`
*   **Authentication**: None
*   **Response (302 Redirect)**: Redirects directly to `/api/auth/google/callback?code=mock-google-auth-code-12345` to simulate OAuth consent flow.

### 1.8 Google OAuth Callback
*   **Endpoint**: `GET /api/auth/google/callback`
*   **Query Parameters**:
    *   `code`: OAuth authorization code.
*   **Response (302 Redirect)**:
    *   *Redirects client back to `/dashboard`.*
    *   *Sets Cookies: `access_token` (15m), `refresh_token` (30d).*
    *   *Creates session & audit logs, auto-provisioning account as status `active`.*

### 1.9 Verify Email (Initial Registration Flow)
*   **Endpoint**: `GET /api/auth/verify-email`
*   **Query Parameters**:
    *   `email`: User register address.
    *   `code`: 6-digit verification code.
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "message": "Email verified successfully. Account is now active."
    }
    ```

### 1.10 Multi-Factor Authentication Setup
*   **Endpoint**: `POST /api/auth/mfa/setup`
*   **Authentication**: Cookies (Requires authenticated session)
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "secret": "MFA_SECRET_BASE32_STRING",
      "qrCodeUrl": "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=...",
      "otpauthUrl": "otpauth://totp/user@example.com?secret=...&issuer=Nexora+ECommerce"
    }
    ```

### 1.11 Multi-Factor Authentication Verification (Activation)
*   **Endpoint**: `POST /api/auth/mfa/verify`
*   **Authentication**: Cookies (Requires authenticated session)
*   **Payload (JSON)**:
    ```json
    {
      "code": "123456" // 6-digit TOTP token generated by client authenticator app
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "message": "Multi-factor authentication successfully enabled on your account."
    }
    ```

### 1.12 Active Session List
*   **Endpoint**: `GET /api/auth/sessions`
*   **Authentication**: Cookies (Requires authenticated session)
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "sessions": [
        {
          "id": "session-uuid",
          "ipAddress": "127.0.0.1",
          "userAgent": "Mozilla/5.0 ...",
          "createdAt": "2026-08-06T12:00:00.000Z",
          "expiresAt": "2026-09-06T12:00:00.000Z",
          "isCurrent": true
        }
      ]
    }
    ```

### 1.13 Revoke Session
*   **Endpoint**: `POST /api/auth/sessions/revoke`
*   **Authentication**: Cookies (Requires session owner credentials)
*   **Payload (JSON)**:
    ```json
    {
      "sessionId": "session-uuid"
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "message": "Session successfully revoked."
    }
    ```

---

## 2. Public Catalog

### 2.1 Get Products (Filtered & Paginated)
*   **Endpoint**: `GET /api/catalog/products`
*   **Authentication**: None
*   **Query Parameters**:
    *   `category`: Slug matching category name.
    *   `brand`: Name of Brand.
    *   `search`: Text query checking name/description.
    *   `minPrice` / `maxPrice`: Float boundaries.
    *   `color` / `size`: Attributes matches.
    *   `sort`: `price_asc`, `price_desc`, or `newest`.
    *   `page` (default 1), `limit` (default 12).
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "products": [
        {
          "id": "product-uuid",
          "name": "Eco Cotton T-Shirt",
          "slug": "eco-cotton-t-shirt",
          "description": "Organic t-shirt",
          "brand": "GreenWear",
          "categories": ["Apparel", "Men"],
          "priceRange": { "min": 25.0, "max": 28.0 },
          "variantsCount": 3,
          "inStock": true,
          "metadata": {}
        }
      ],
      "pagination": {
        "total": 1,
        "page": 1,
        "limit": 12,
        "totalPages": 1
      }
    }
    ```

### 2.2 Get Product Details
*   **Endpoint**: `GET /api/catalog/products/[slug]`
*   **Authentication**: None
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "product": {
        "id": "product-uuid",
        "name": "Eco Cotton T-Shirt",
        "slug": "eco-cotton-t-shirt",
        "description": "Organic t-shirt",
        "brand": { "id": "brand-uuid", "name": "GreenWear", "logoUrl": null },
        "categories": [{ "id": "cat-uuid", "name": "Apparel", "slug": "apparel" }],
        "variants": [
          {
            "id": "variant-uuid",
            "sku": "TSHIRT-CO-BLU-L",
            "price": 25.0,
            "compareAtPrice": 30.0,
            "weightKg": 0.2,
            "dimensions": null,
            "attributes": { "color": "blue", "size": "L" },
            "stock": 45,
            "inStock": true
          }
        ],
        "metadata": {},
        "relatedProducts": [
          { "id": "rel-uuid", "name": "Classic Jeans", "slug": "classic-jeans", "price": 45.0 }
        ]
      }
    }
    ```

### 2.3 Catalog Search (Faceted Search)
*   **Endpoint**: `GET /api/catalog/search`
*   **Authentication**: None (Implicitly logs query if user has session)
*   **Query Parameters**:
    *   `q`: Search query term.
    *   `category`, `brand`, `color`, `size`: Attribute facets filters.
    *   `minPrice` / `maxPrice`: Float boundaries.
    *   `sort`: `relevance`, `price_asc`, `price_desc`, `newest`.
    *   `page` (default 1), `limit` (default 12).
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "source": "elasticsearch", // "elasticsearch" or "database" fallback
      "products": [
        {
          "id": "product-uuid",
          "name": "Premium Hoodie",
          "slug": "premium-hoodie",
          "description": "Organic hoodie",
          "brand": "GreenWear",
          "categories": ["Apparel"],
          "minPrice": 49.99,
          "maxPrice": 49.99,
          "colors": ["Blue"],
          "sizes": ["M", "L"]
        }
      ],
      "facets": {
        "categories": [{ "name": "Apparel", "count": 1 }],
        "brands": [{ "name": "GreenWear", "count": 1 }],
        "colors": [{ "name": "Blue", "count": 1 }],
        "sizes": [{ "name": "M", "count": 1 }, { "name": "L", "count": 1 }]
      },
      "pagination": {
        "total": 1,
        "page": 1,
        "limit": 12,
        "totalPages": 1
      }
    }
    ```

### 2.4 Search Suggestions & Autocomplete
*   **Endpoint**: `GET /api/catalog/search/suggest`
*   **Authentication**: None (Checks access token cookie for User scope to load Recent Searches)
*   **Query Parameters**:
    *   `q`: Search query string typing trigger.
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "autocomplete": [
        { "name": "Premium Hoodie", "slug": "premium-hoodie" }
      ],
      "recent": ["hoodie", "sneakers"],
      "popular": ["hoodie", "sneaker", "cotton", "organic"],
      "trending": [
        { "id": "p-uuid", "name": "Premium Hoodie", "slug": "premium-hoodie", "price": 49.99 }
      ]
    }
    ```

### 2.5 Shopping Cart Management
*   **Endpoint**: `GET /api/catalog/cart`
*   **Authentication**: Optional (Reads `access_token` for logged-in user or falls back to `guest_cart_id` cookie)
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "cart": {
        "id": "cart-uuid",
        "couponDetails": null,
        "giftCardDetails": null,
        "activeItems": [
          {
            "id": "cart-item-uuid",
            "quantity": 1,
            "isSavedForLater": false,
            "hasInventoryError": false,
            "maxAvailable": 100,
            "productVariant": {
              "id": "variant-uuid",
              "sku": "HOOD-ECO-M",
              "price": 49.99,
              "compareAtPrice": 59.99,
              "weightKg": 0.5,
              "attributes": { "color": "Blue", "size": "M" },
              "productName": "Premium Hoodie",
              "productSlug": "premium-hoodie"
            }
          }
        ],
        "savedItems": [],
        "summary": {
          "subtotal": 49.99,
          "couponDiscount": 0.0,
          "giftCardApplied": 0.0,
          "shippingEstimate": 5.0,
          "taxEstimate": 4.0,
          "total": 58.99
        }
      }
    }
    ```

*   **Endpoint**: `POST /api/catalog/cart`
*   **Payload (JSON)**:
    ```json
    {
      "variantId": "variant-uuid",
      "quantity": 1
    }
    ```
*   **Response (201 Created)**:
    ```json
    {
      "success": true,
      "message": "Item added to cart successfully"
    }
    ```

*   **Endpoint**: `PUT /api/catalog/cart`
*   **Payload (JSON)**:
    ```json
    {
      "cartItemId": "cart-item-uuid",
      "quantity": 2,
      "isSavedForLater": false
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "message": "Cart item updated successfully"
    }
    ```

*   **Endpoint**: `DELETE /api/catalog/cart`
*   **Query Parameters**:
    *   `cartItemId`: String.
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "message": "Cart item removed successfully"
    }
    ```

### 2.6 Apply Offers or Vouchers
*   **Endpoint**: `POST /api/catalog/cart/apply`
*   **Payload (JSON)**:
    ```json
    {
      "type": "coupon", // or "giftcard"
      "code": "SAVE20" // or "GIFT100"
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "message": "Coupon code 'SAVE20' applied successfully!"
    }
    ```

### 2.7 Merge Guest Cart
*   **Endpoint**: `POST /api/catalog/cart/merge`
*   **Authentication**: Cookies (Requires authenticated session)
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "message": "Cart successfully merged!"
    }
### 2.8 Get User Wallet Details
*   **Endpoint**: `GET /api/catalog/checkout/wallet`
*   **Authentication**: Optional (Reads `access_token` for logged-in user, seeds test balance on first call)
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "balance": 150.0,
      "isGuest": false
    }
    ```

### 2.9 Place Checkout Order
*   **Endpoint**: `POST /api/catalog/checkout`
*   **Payload (JSON)**:
    ```json
    {
      "email": "customer@example.com",
      "shippingAddress": {
        "name": "John Doe",
        "street": "123 Shopping Blvd",
        "city": "Atlanta",
        "state": "GA",
        "zip": "30301",
        "country": "USA",
        "phone": "+1 555-0199"
      },
      "billingAddress": {
        "name": "John Doe",
        "street": "123 Shopping Blvd",
        "city": "Atlanta",
        "state": "GA",
        "zip": "30301",
        "country": "USA"
      },
      "shippingMethod": "standard", // or "express"
      "paymentMethod": "stripe", // "cod", "wallet", "stripe", "paypal", "razorpay"
      "useWallet": true
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "orderId": "order-uuid",
      "message": "Order placed successfully!"
    }
    ```

### 2.10 Get Customer Orders History
*   **Endpoint**: `GET /api/catalog/orders`
*   **Authentication**: Optional (Reads session cookies for logged-in user, accepts `email` query param for guest lookups)
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "orders": [
        {
          "id": "order-uuid",
          "email": "customer@example.com",
          "total": 58.99,
          "status": "processing",
          "createdAt": "2026-08-06T17:24:14.000Z",
          "items": [
            { "id": "item-uuid", "productName": "Premium Hoodie", "sku": "HOOD-ECO-M", "quantity": 1, "price": 49.99 }
          ],
          "shipments": []
        }
      ],
      "notifications": [
        { "id": "alert-uuid", "title": "Order Placed", "message": "Your order #order-uuid is processing.", "createdAt": "..." }
      ]
    }
    ```

### 2.11 Customer Self-Service Cancellation or Return
*   **Endpoint**: `PUT /api/catalog/orders`
*   **Payload (JSON)**:
    ```json
    {
      "orderId": "order-uuid",
      "action": "cancel" // or "return"
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "message": "Order cancelled successfully."
    }
    ```
### 2.12 Create Product Review
*   **Endpoint**: `POST /api/catalog/reviews`
*   **Authentication**: Cookies (Requires login)
*   **Payload (JSON)**:
    ```json
    {
      "productId": "product-uuid",
      "rating": 5, // integer 1-5
      "comment": "Exceptional sustainable quality cotton shirt!"
    }
    ```
*   **Response (201 Created)**:
    ```json
    {
      "success": true,
      "message": "Feedback review submitted successfully!"
    }
    ```
### 2.13 Get Recommendation Engine Details
*   **Endpoint**: `GET /api/catalog/recommendations`
*   **Query Parameters**:
    *   `productId`: Active product context ID (optional).
    *   `recentlyViewedIds`: Comma-separated product IDs list.
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "frequentlyBoughtTogether": [...],
      "relatedProducts": [...],
      "upsell": [...],
      "crossSell": [...],
      "recentlyViewed": [...],
      "trending": [...],
      "popular": [...],
      "collaborativeFiltering": [...],
      "similarityMatrix": [
        { "userId": "user-uuid-1", "similarity": 0.85 }
      ]
    }
### 2.14 Read User Notification Preferences
*   **Endpoint**: `GET /api/catalog/notifications/preferences`
*   **Authentication**: Cookies (Requires login)
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "preferences": {
        "emailTransactional": true,
        "emailMarketing": true,
        "smsAlerts": true,
        "pushNotifications": true
      }
    }
    ```

### 2.15 Update User Notification Preferences
*   **Endpoint**: `PUT /api/catalog/notifications/preferences`
*   **Authentication**: Cookies (Requires login)
*   **Payload (JSON)**:
    ```json
    {
      "emailTransactional": true,
      "emailMarketing": false,
      "smsAlerts": true,
      "pushNotifications": true
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "message": "Preferences updated successfully"
    }
    ```

### 2.16 Enqueue Test Notification Job
*   **Endpoint**: `POST /api/catalog/notifications/test`
*   **Payload (JSON)**:
    ```json
    {
      "channel": "email", // or "sms", "push", "whatsapp"
      "templateName": "order_placed",
      "recipient": "customer@example.com",
      "payload": { "orderId": "order-123", "name": "Jane" }
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "message": "Notification enqueued in active job queue successfully!"
    }
    ```
### 2.17 Track Telemetry Events
*   **Endpoint**: `POST /api/catalog/analytics/track`
*   **Payload (JSON)**:
    ```json
    {
      "type": "visit", // or "click"
      "path": "/cart", // for type 'visit'
      "referrer": "http://referrer.com",
      "pagePath": "/cart", // for type 'click'
      "selector": "button#checkout",
      "x": 120,
      "y": 45
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "message": "Page visit tracked successfully"
    }
    ```

---

## 3. Administrative Management

*All admin endpoints check JWT access cookies inside middleware, looking for roles: `admin` or `super_admin` (and sometimes `seller` depending on scope).*

### 3.1 Bulk Upload Products (CSV Data Import)
*   **Endpoint**: `POST /api/admin/products/bulk-upload`
*   **Authentication**: Cookies (Requires role `admin`, `super_admin`, or `seller`)
*   **Payload (JSON)**:
    ```json
    {
      "csvContent": "name,slug,description,brand,categories,sku,price,compareAtPrice,weight,color,size,inventory\nEco Shirt,eco-shirt,Nice shirt,GreenWear,Apparel,SHIRT-01,15.99,19.99,0.3,Green,M,100"
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "message": "Successfully uploaded 1 product variants.",
      "skus": ["SHIRT-01"]
    }
    ```

### 3.2 Read System Audit Logs
*   **Endpoint**: `GET /api/admin/audit-logs`
*   **Authentication**: Cookies (Requires role `admin` or `super_admin`)
*   **Query Parameters**:
    *   `action`: filter by action string (e.g. `user_login`).
    *   `tableName`: filter by target model name (e.g. `User`).
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "logs": [
        {
          "id": "log-uuid",
          "userId": "user-uuid",
          "action": "user_login",
          "tableName": "User",
          "rowId": "user-uuid",
          "oldValues": null,
          "newValues": null,
          "ipAddress": "127.0.0.1",
          "createdAt": "2026-08-06T16:00:00.000Z",
          "user": {
            "email": "user@example.com",
            "firstName": "John",
            "lastName": "Doe"
          }
        }
      ]
    }
    ```

### 3.3 List Administrative Products
*   **Endpoint**: `GET /api/admin/products`
*   **Authentication**: Cookies (Requires role `admin`, `super_admin`, or `seller`)
*   **Response (200 OK)**: Returns full models list including inactive products and all variant associations.

### 3.4 Create Product
*   **Endpoint**: `POST /api/admin/products`
*   **Authentication**: Cookies (Requires role `admin`, `super_admin`, or `seller`)
*   **Payload (JSON)**:
    ```json
    {
      "name": "Eco Cotton T-Shirt",
      "slug": "eco-cotton-t-shirt",
      "description": "Organic shirt description",
      "brandName": "GreenWear",
      "categoryNames": ["Apparel", "Men"],
      "metadata": { "ecoCertified": true }
    }
    ```
*   **Response (201 Created)**: Returns the newly created `Product` object.

### 3.5 Read Product Detail
*   **Endpoint**: `GET /api/admin/products/[id]`
*   **Authentication**: Cookies (Requires role `admin`, `super_admin`, or `seller`)
*   **Response (200 OK)**: Returns detailed `Product` item including metadata and complete lists of categories and variants.

### 3.6 Update Product
*   **Endpoint**: `PUT /api/admin/products/[id]`
*   **Authentication**: Cookies (Requires role `admin`, `super_admin`, or `seller`)
*   **Payload (JSON)**: Fields to modify (`name`, `slug`, `description`, `brandName`, `categoryNames`, `metadata`, `isActive`).
*   **Response (200 OK)**: `{ "success": true, "message": "Product updated successfully" }`

### 3.7 Delete Product
*   **Endpoint**: `DELETE /api/admin/products/[id]`
*   **Authentication**: Cookies (Requires role `admin`, `super_admin`, or `seller`)
*   **Response (200 OK)**: `{ "success": true, "message": "Product deleted successfully" }`

### 3.8 List Product Variants
*   **Endpoint**: `GET /api/admin/products/[id]/variants`
*   **Authentication**: Cookies (Requires role `admin`, `super_admin`, or `seller`)
*   **Response (200 OK)**: Returns list of variants associated with the product ID, including inventory levels.

### 3.9 Create Product Variant
*   **Endpoint**: `POST /api/admin/products/[id]/variants`
*   **Authentication**: Cookies (Requires role `admin`, `super_admin`, or `seller`)
*   **Payload (JSON)**:
    ```json
    {
      "sku": "TSHIRT-CO-BLU-M",
      "price": 24.50,
      "compareAtPrice": 29.99,
      "weightKg": 0.18,
      "color": "blue",
      "size": "M",
      "inventoryQuantity": 50 // initial warehouse allocation
    }
    ```
*   **Response (201 Created)**: Returns the created `ProductVariant` record.

### 3.10 List System Users
*   **Endpoint**: `GET /api/users`
*   **Authentication**: Cookies (Requires role `admin` or `super_admin`)
*   **Query Parameters**:
    *   `role`: Filter by role string (e.g. `seller`).
    *   `status`: Filter by status string (e.g. `active`).
    *   `search`: Text query checking email/names.
*   **Response (200 OK)**: Returns formatted users details including array lists of roles.

### 3.11 Create User
*   **Endpoint**: `POST /api/users`
*   **Authentication**: Cookies (Requires role `admin` or `super_admin`)
*   **Payload (JSON)**:
    ```json
    {
      "email": "staff@nexora.com",
      "password": "temporarypassword123",
      "firstName": "Alice",
      "lastName": "Support",
      "role": "support_executive"
    }
    ```
*   **Response (201 Created)**: Returns created user detail (`status: "active"` automatically).

### 3.12 Read User Detail
*   **Endpoint**: `GET /api/users/[id]`
*   **Authentication**: Cookies (Requires role `admin` or `super_admin`)
*   **Response (200 OK)**: Detailed user statistics including email, name, role profiles, phone, and metadata.

### 3.13 Update User Profile/Status
*   **Endpoint**: `PUT /api/users/[id]`
*   **Authentication**: Cookies (Requires role `admin` or `super_admin`)
*   **Payload (JSON)**: Fields to modify (`firstName`, `lastName`, `phoneNumber`, `status`, `roles`).
*   **Response (200 OK)**: `{ "success": true, "message": "User updated successfully" }`

### 3.14 Delete User
*   **Endpoint**: `DELETE /api/users/[id]`
*   **Authentication**: Cookies (Requires role `admin` or `super_admin`)
*   *Note: Prevents self-deletion loops by returning a 400 Bad Request error if a user deletes their own ID.*
*   **Response (200 OK)**: `{ "success": true, "message": "User deleted successfully" }`

### 3.15 List Administrative Orders
*   **Endpoint**: `GET /api/admin/orders`
*   **Authentication**: Cookies (Requires role `admin` or `super_admin`)
*   **Query Parameters**:
    *   `status`: Filter by order fulfillment status.
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "orders": [
        {
          "id": "order-uuid",
          "email": "customer@example.com",
          "total": 58.99,
          "status": "processing",
          "createdAt": "2026-08-06T17:24:14.000Z",
          "user": { "firstName": "John", "lastName": "Doe", "email": "customer@example.com" },
          "items": [...],
          "shipments": []
        }
      ]
    }
    ```

### 3.16 Read & Manage Administrative Order
*   **Endpoint**: `GET /api/admin/orders/[id]`
*   **Authentication**: Cookies (Requires role `admin` or `super_admin`)
*   **Response (200 OK)**: Returns detailed order configuration with shipments, items, and alert notification logs.

*   **Endpoint**: `PUT /api/admin/orders/[id]`
*   **Authentication**: Cookies (Requires role `admin` or `super_admin`)
*   **Payload (JSON)**:
    ```json
    {
      "action": "update_status", // or "cancel", "refund"
      "status": "shipped", // for update_status
      "refundItemIds": ["item-uuid-1"] // for partial refund
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "message": "Action processed successfully."
    }
    ```

### 3.17 Create Split Shipment
*   **Endpoint**: `POST /api/admin/orders/[id]/shipments`
*   **Authentication**: Cookies (Requires role `admin` or `super_admin`)
*   **Payload (JSON)**:
    ```json
    {
      "carrier": "FedEx",
      "trackingNumber": "TRK1234567890",
      "itemIds": ["item-uuid-1", "item-uuid-2"]
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "shipment": {
        "id": "shipment-uuid",
        "carrier": "FedEx",
        "trackingNumber": "TRK1234567890",
        "status": "shipped"
      }
    }
### 3.18 Get Seller Dashboard Details
*   **Endpoint**: `GET /api/seller/dashboard`
*   **Authentication**: Cookies (Requires role `seller`, `admin`, or `super_admin`)
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "seller": { "id": "seller-uuid", "name": "Store Workspace", "email": "seller@example.com" },
      "analytics": {
        "revenue": 120.0,
        "totalOrders": 2,
        "totalItemsSold": 3,
        "activeStock": 450,
        "totalCustomers": 2
      },
      "orders": [...],
      "inventory": [...],
      "returns": [],
      "reviews": []
    }
### 3.19 Get Admin Dashboard Stats
*   **Endpoint**: `GET /api/admin/dashboard`
*   **Authentication**: Cookies (Requires role `admin` or `super_admin`)
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "analytics": {
        "totalUsers": 12,
        "totalSellers": 4,
        "totalOrders": 15,
        "totalRevenue": 2400.0,
        "lowStockAlerts": []
      },
      "systemConfig": {
        "guestCheckoutEnabled": true,
        "walletPaymentEnabled": true,
        "couponValidationEnabled": true,
        "maintenanceMode": false,
        "homepageBanners": "[]"
      },
      "users": [...],
      "sellers": [...]
    }
    ```

### 3.20 Update System Feature Flags & Banners
*   **Endpoint**: `PUT /api/admin/dashboard/config`
*   **Authentication**: Cookies (Requires role `admin` or `super_admin`)
*   **Payload (JSON)**:
    ```json
    {
      "guestCheckoutEnabled": true,
      "walletPaymentEnabled": true,
      "couponValidationEnabled": true,
      "maintenanceMode": false,
      "homepageBanners": "[]"
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "message": "System configuration updated successfully"
    }
    ```

### 3.21 Update Seller Verification Status
*   **Endpoint**: `PUT /api/admin/sellers/[id]`
*   **Authentication**: Cookies (Requires role `admin` or `super_admin`)
*   **Payload (JSON)**:
    ```json
    {
      "isVerified": true
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "message": "Seller account updated successfully"
    }
### 3.22 Read Notification Queue History
*   **Endpoint**: `GET /api/admin/notifications/process`
*   **Authentication**: Cookies (Requires role `admin` or `super_admin`)
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "queue": [
        {
          "id": "job-uuid",
          "channel": "email",
          "templateName": "order_placed",
          "recipient": "customer@example.com",
          "status": "pending",
          "retryCount": 0,
          "maxRetries": 3,
          "errorMessage": null,
          "createdAt": "2026-08-06T17:39:10.000Z"
        }
      ]
    }
    ```

### 3.23 Process Pending Notification Queue
*   **Endpoint**: `POST /api/admin/notifications/process`
*   **Authentication**: Cookies (Requires role `admin` or `super_admin`)
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "processedCount": 1,
      "logs": [
        { "jobId": "job-uuid", "channel": "email", "status": "sent" }
      ]
    }
### 3.24 Get Platform Analytics Details
*   **Endpoint**: `GET /api/admin/analytics`
*   **Authentication**: Cookies (Requires role `admin` or `super_admin`)
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "sales": {
        "totalRevenue": 2400.0,
        "totalOrdersCount": 15,
        "averageOrderValue": 160.0,
        "salesOverTime": [
          { "day": "Mon", "sales": 340.0, "orders": 2 }
        ]
      },
      "conversionFunnel": {
        "visits": 120,
        "cartAdds": 45,
        "checkouts": 20,
        "orders": 15
      },
      "trafficLogs": [
        { "path": "/cart", "count": 45 }
      ],
      "clickLogs": [
        { "id": "click-uuid", "pagePath": "/", "selector": "button#checkout", "x": 120, "y": 45 }
      ]
    }
    ```

---

## 4. User Profiles & Address Management

### 4.1 Read Personal Profile
*   **Endpoint**: `GET /api/profile`
*   **Authentication**: Cookies (Requires login)
*   **Response (200 OK)**: Returns the current user's profile information including preferences and address lists.

### 4.2 Update Personal Profile
*   **Endpoint**: `PUT /api/profile`
*   **Authentication**: Cookies (Requires login)
*   **Payload (JSON)**: Fields to update (`firstName`, `lastName`, `phoneNumber`).
*   **Response (200 OK)**: Returns the updated profile details.

### 4.3 Read Notification Preferences
*   **Endpoint**: `GET /api/profile/preferences`
*   **Authentication**: Cookies (Requires login)
*   **Response (200 OK)**: Returns user's transaction/marketing alert flags.

### 4.4 Update Notification Preferences
*   **Endpoint**: `PUT /api/profile/preferences`
*   **Authentication**: Cookies (Requires login)
*   **Payload (JSON)**: Fields to update (`emailTransactional`, `emailMarketing`, `smsAlerts`, `pushNotifications`).
*   **Response (200 OK)**: Returns the updated preferences flags.

### 4.5 List User Addresses
*   **Endpoint**: `GET /api/addresses`
*   **Authentication**: Cookies (Requires login)
*   **Response (200 OK)**: Returns the active addresses list sorted by creation timestamp.

### 4.6 Create Address
*   **Endpoint**: `POST /api/addresses`
*   **Authentication**: Cookies (Requires login)
*   **Payload (JSON)**:
    ```json
    {
      "recipientName": "Jane Doe",
      "phoneNumber": "+1098765432",
      "addressLine1": "456 Oak Lane",
      "city": "Denver",
      "state": "CO",
      "postalCode": "80201",
      "country": "USA",
      "isDefaultBilling": true,
      "isDefaultShipping": true
    }
    ```
*   **Response (201 Created)**: Returns the newly created `Address` record.
*   *Note: Automatically resets other address defaults under the user inside a single database transaction.*

### 4.7 Read Address Detail
*   **Endpoint**: `GET /api/addresses/[id]`
*   **Authentication**: Cookies (Requires address owner credentials)
*   **Response (200 OK)**: Returns details of the matched address ID.

### 4.8 Update Address
*   **Endpoint**: `PUT /api/addresses/[id]`
*   **Authentication**: Cookies (Requires address owner credentials)
*   **Payload (JSON)**: Fields to modify (`recipientName`, `phoneNumber`, `addressLine1`, `addressLine2`, `city`, `state`, `postalCode`, `country`, `isDefaultBilling`, `isDefaultShipping`).
*   **Response (200 OK)**: Returns the updated `Address` record.

### 4.9 Delete Address
*   **Endpoint**: `DELETE /api/addresses/[id]`
*   **Authentication**: Cookies (Requires address owner credentials)
*   **Response (200 OK)**: `{ "success": true, "message": "Address deleted successfully" }`
