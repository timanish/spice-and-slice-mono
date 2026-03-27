# Admin Customer Messaging System - Design Document

**Date:** 2026-03-27
**Purpose:** Allow admins to send custom templated messages to customers for order/payment issues

---

## Overview

A simple, one-off messaging system for admins to send templated emails to individual customers with optional order context. Messages are logged for history and audit trail.

---

## Data Model

### `admin_message_templates` Table
- `id` (UUID) - Primary key
- `name` (TEXT) - Template name, e.g., "Payment Failed - Manual Refund"
- `subject` (TEXT) - Email subject with placeholders
- `body` (TEXT) - Email body with placeholders
- `is_active` (BOOLEAN) - Enable/disable templates
- `created_at` (TIMESTAMP)

### `customer_messages` Table
- `id` (UUID) - Primary key
- `user_id` (TEXT) - Customer ID (Clerk user ID)
- `order_id` (UUID, nullable) - Optional reference to order
- `template_id` (UUID) - Which template was used
- `subject` (TEXT) - Rendered subject line
- `message_body` (TEXT) - Rendered message body
- `sent_at` (TIMESTAMP) - When sent
- `sent_by_user_id` (TEXT) - Admin who sent it
- `created_at` (TIMESTAMP)

**Indexes:**
- `idx_customer_messages_user_id` for quick lookup by customer
- `idx_customer_messages_sent_at` for sorting by date

---

## Available Placeholders

When rendering templates, replace:
- `{customer_name}` → from profiles.full_name
- `{order_id}` → from orders.id
- `{order_total}` → from orders.total_amount
- `{order_date}` → from orders.created_at
- `{delivery_address}` → from orders.delivery_address_line1, etc.
- `{phone_number}` → from profiles.phone_number

---

## Pre-seeded Templates

**Template 1: Payment Failed - Manual Refund**
```
Subject: Your Order #{order_id} - Refund Credit Applied

Hi {customer_name},

We're sorry your payment didn't process for order #{order_id} placed on {order_date}.

We've issued a manual refund of ${order_total} to your account. You can use this credit on your next order.

If you have any questions, please contact us.

Best regards,
Spice and Slice
```

**Template 2: Order Processing Delay**
```
Subject: Update on Your Order #{order_id}

Hi {customer_name},

We're currently preparing your delivery for {delivery_address}.

Your order will be delivered within the next 3-5 business days.

Thank you for your patience!

Best regards,
Spice and Slice
```

**Template 3: Custom Message**
- Allows admins to write fully custom subject and body
- No placeholders, just freeform text

---

## UI & User Flow

**Page:** `/admin/customer-messages`

### Layout

1. **Search Bar (Top)**
   - Find customer by email, name, or phone
   - Shows matching customer results

2. **Two-Tab Interface**

   **Tab 1: Send Message**
   - Customer info display (name, email, phone)
   - Optional order selector dropdown
   - Template selector dropdown
   - **Message preview:**
     - Rendered subject line
     - Rendered body text
     - "Edit message" link to manually override
   - "Send" and "Cancel" buttons
   - Confirmation dialog before sending

   **Tab 2: Message History**
   - Table with columns: Date Sent, Template, Order ID, Sent By, Subject
   - Click to view full message
   - Sort/filter by date

### Sending Flow

1. Admin selects customer
2. Admin optionally selects an order
3. Admin selects a template
4. System renders subject/body with placeholders
5. Admin reviews and clicks "Send"
6. Confirmation dialog appears
7. On confirmation:
   - Email sent to customer
   - BCC sent to spiceandslicedfw@gmail.com
   - Record created in customer_messages table
   - Toast: "Message sent to {email}"

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| Email send fails | Log error, save message with `sent_at = null`, show toast "Message saved but email failed. Try again?" |
| Customer has no email | Block sending, show warning "This customer has no email on file" |
| Order deleted | Still allow sending, order_id becomes null gracefully |
| Template not found | Fall back to custom message or show error |

---

## Email Sending

**Function:** Extend existing `send-contact-email` or create `send-admin-customer-message`

**Implementation:**
- Use Resend API (existing setup)
- To: customer email
- BCC: spiceandslicedfw@gmail.com
- From: SpiceAndSlice <orders@management.spiceandslice.shop>
- Subject/Body: From rendered template

---

## Access Control

- Only admins can access `/admin/customer-messages`
- Uses existing `AdminGuard` component
- All sends are logged with `sent_by_user_id` for audit trail

---

## Future Enhancements (Not MVP)

- Custom template CRUD (create/edit/delete templates)
- Bulk messaging (send same message to multiple customers)
- Message scheduling (send at a later time)
- Message templates per fulfillment type (delivery vs pickup messaging)
- SMS option (in addition to email)

---

## Testing Checklist

- [ ] Send message to test customer
- [ ] Verify email arrives at customer
- [ ] Verify BCC sent to admin email
- [ ] Check message_history tab shows sent message
- [ ] Test with/without order reference
- [ ] Test placeholder replacement
- [ ] Test error handling (missing email, failed send)
- [ ] Test custom message template
- [ ] Test permission/access control
