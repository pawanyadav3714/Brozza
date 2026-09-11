# Security Specification

## Data Invariants
- An order must have a valid `userId` matching the authenticated user (or be readable by admin).
- An order's `totalPrice` must match `quantity * dish.price` (client-side validation enforced by rules).
- Timestamps `createdAt` and `updatedAt` must be set by the server.
- The `status` field can only be updated to a valid `OrderStatus` enum value.
- Only admins can read all orders; users can only read their own orders.

## The Dirty Dozen Payloads
1. Create order with someone else's `userId`.
2. Update an order's `totalPrice` arbitrarily.
3. Update `createdAt` after initial creation.
4. Set an invalid `status` (e.g., "delivered_by_aliens").
5. Read all orders without being an admin.
6. Delete an order without being an admin (users shouldn't delete once ordered).
7. Inject a 1MB string into `customerName`.
8. Update `dishId` after creation.
9. Create order with a phone number that isn't 10 digits.
10. Update an order's `userId`.
11. Create order with a negative `quantity`.
12. Read an order belonging to another user.

## Test Runner Logic
The following rules will be tested to ensure these payloads return `PERMISSION_DENIED`.
