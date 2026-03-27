# Admin Customer Messaging System - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an admin interface to send templated messages to customers with email delivery and message history tracking.

**Architecture:**
- Database: Two new tables (templates, sent messages) with migrations
- Email: Extend existing send-contact-email function to support custom messages
- UI: New admin page with customer search, template selection, preview, and history tab
- Logging: All sent messages stored for audit trail and history

**Tech Stack:** React, TypeScript, Supabase (PostgreSQL), Resend (email), Tailwind CSS, shadcn/ui

---

## Phase 1: Database Migrations & Types

### Task 1: Create migration for admin_message_templates table

**Files:**
- Create: `supabase/migrations/20260327000002_create_message_templates_table.sql`

**Step 1: Write migration file**

```sql
-- Create admin_message_templates table
CREATE TABLE IF NOT EXISTS public.admin_message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster filtering
CREATE INDEX idx_templates_is_active ON public.admin_message_templates(is_active);

-- Insert pre-seeded templates
INSERT INTO public.admin_message_templates (name, subject, body, is_active)
VALUES
  (
    'Payment Failed - Manual Refund',
    'Your Order #{order_id} - Refund Credit Applied',
    'Hi {customer_name},

We''re sorry your payment didn''t process for order #{order_id} placed on {order_date}.

We''ve issued a manual refund of ${order_total} to your account. You can use this credit on your next order.

If you have any questions, please contact us.

Best regards,
Spice and Slice'
  ),
  (
    'Order Processing Delay',
    'Update on Your Order #{order_id}',
    'Hi {customer_name},

We''re currently preparing your delivery for {delivery_address}.

Your order will be delivered within the next 3-5 business days.

Thank you for your patience!

Best regards,
Spice and Slice'
  ),
  (
    'Custom Message',
    '[Admin will provide subject]',
    '[Admin will provide message]',
    TRUE
  );

ALTER TABLE public.admin_message_templates DISABLE ROW LEVEL SECURITY;
```

**Step 2: Verify migration syntax**

Run: `cat supabase/migrations/20260327000002_create_message_templates_table.sql`

Expected: File contains valid SQL with three INSERT statements

---

### Task 2: Create migration for customer_messages table

**Files:**
- Create: `supabase/migrations/20260327000003_create_customer_messages_table.sql`

**Step 1: Write migration file**

```sql
-- Create customer_messages table for logging sent messages
CREATE TABLE IF NOT EXISTS public.customer_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  template_id UUID NOT NULL REFERENCES public.admin_message_templates(id),
  subject TEXT NOT NULL,
  message_body TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  sent_by_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for queries
CREATE INDEX idx_customer_messages_user_id ON public.customer_messages(user_id);
CREATE INDEX idx_customer_messages_sent_at ON public.customer_messages(sent_at DESC);
CREATE INDEX idx_customer_messages_order_id ON public.customer_messages(order_id);

-- Disable RLS for admin access
ALTER TABLE public.customer_messages DISABLE ROW LEVEL SECURITY;
```

**Step 2: Verify migration syntax**

Run: `cat supabase/migrations/20260327000003_create_customer_messages_table.sql`

Expected: File contains valid SQL with CREATE TABLE and CREATE INDEX statements

---

### Task 3: Update Supabase types

**Files:**
- Modify: `src/integrations/supabase/types.ts`

**Step 1: Add to Database type definition**

In the `Database` interface, add these two table definitions:

```typescript
admin_message_templates: {
  Row: {
    id: string;
    name: string;
    subject: string;
    body: string;
    is_active: boolean;
    created_at: string;
  };
  Insert: {
    id?: string;
    name: string;
    subject: string;
    body: string;
    is_active?: boolean;
    created_at?: string;
  };
  Update: {
    id?: string;
    name?: string;
    subject?: string;
    body?: string;
    is_active?: boolean;
    created_at?: string;
  };
};
customer_messages: {
  Row: {
    id: string;
    user_id: string;
    order_id: string | null;
    template_id: string;
    subject: string;
    message_body: string;
    sent_at: string | null;
    sent_by_user_id: string;
    created_at: string;
  };
  Insert: {
    id?: string;
    user_id: string;
    order_id?: string | null;
    template_id: string;
    subject: string;
    message_body: string;
    sent_at?: string | null;
    sent_by_user_id: string;
    created_at?: string;
  };
  Update: {
    id?: string;
    user_id?: string;
    order_id?: string | null;
    template_id?: string;
    subject?: string;
    message_body?: string;
    sent_at?: string | null;
    sent_by_user_id?: string;
    created_at?: string;
  };
};
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: No TypeScript errors

---

## Phase 2: Email Sending Function

### Task 4: Create send-admin-customer-message function

**Files:**
- Create: `supabase/functions/send-admin-customer-message/index.ts`

**Step 1: Create function file**

```typescript
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { authenticateRequest } from "../_shared/clerk-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const ADMIN_EMAIL = "spiceandslicedfw@gmail.com";
const SENDER_EMAIL = "SpiceAndSlice <orders@management.spiceandslice.shop>";

const getServiceRoleClient = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  return createClient(supabaseUrl, serviceRoleKey);
};

interface MessageData {
  recipientEmail: string;
  subject: string;
  messageBody: string;
  userId: string;
  templateId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const serviceClient = getServiceRoleClient();

    // Authenticate request (admin only)
    const authHeader = req.headers.get("Authorization");
    const adminUserId = await authenticateRequest(authHeader, serviceClient, true);

    const messageData: MessageData = await req.json();

    if (!messageData.recipientEmail || !messageData.subject || !messageData.messageBody) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send email
    const emailResponse = await resend.emails.send({
      from: SENDER_EMAIL,
      to: messageData.recipientEmail,
      bcc: ADMIN_EMAIL,
      subject: messageData.subject,
      html: messageData.messageBody,
    });

    if (emailResponse.error) {
      console.error("Email send error:", emailResponse.error);
      throw new Error(`Failed to send email: ${emailResponse.error.message}`);
    }

    // Log message to database
    const { error: logError } = await serviceClient
      .from("customer_messages")
      .insert({
        user_id: messageData.userId,
        template_id: messageData.templateId,
        subject: messageData.subject,
        message_body: messageData.messageBody,
        sent_at: new Date().toISOString(),
        sent_by_user_id: adminUserId,
      });

    if (logError) {
      console.error("Error logging message:", logError);
      throw new Error("Message sent but failed to log");
    }

    return new Response(
      JSON.stringify({ success: true, messageId: emailResponse.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-admin-customer-message:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

**Step 2: Verify function syntax**

Run: `cat supabase/functions/send-admin-customer-message/index.ts | head -20`

Expected: TypeScript code with proper imports and function definition

---

## Phase 3: Admin UI Components

### Task 5: Create customer search hook

**Files:**
- Create: `src/hooks/useCustomerSearch.ts`

**Step 1: Write hook**

```typescript
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Customer {
  id: string;
  email: string;
  full_name: string;
  phone_number: string;
}

export const useCustomerSearch = () => {
  const [results, setResults] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: searchError } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone_number')
        .or(
          `email.ilike.%${query}%,full_name.ilike.%${query}%,phone_number.ilike.%${query}%`
        )
        .limit(10);

      if (searchError) throw searchError;

      setResults(data as Customer[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { results, isLoading, error, search };
};
```

**Step 2: Test hook exists**

Run: `cat src/hooks/useCustomerSearch.ts`

Expected: Hook file with search function and TypeScript types

---

### Task 6: Create template rendering utility

**Files:**
- Create: `src/lib/renderMessageTemplate.ts`

**Step 1: Write utility**

```typescript
interface TemplateVariables {
  customer_name?: string;
  order_id?: string;
  order_total?: string;
  order_date?: string;
  delivery_address?: string;
  phone_number?: string;
}

export function renderTemplate(
  template: string,
  variables: TemplateVariables
): string {
  let result = template;

  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{${key}}`;
    result = result.replace(new RegExp(placeholder, 'g'), value || '');
  });

  return result;
}

export function extractVariables(
  template: string
): string[] {
  const matches = template.match(/{(\w+)}/g) || [];
  return matches.map(m => m.slice(1, -1)); // Remove { }
}
```

**Step 2: Test utility**

Run: `cat src/lib/renderMessageTemplate.ts`

Expected: Two exported functions for template rendering

---

### Task 7: Create AdminCustomerMessagingPage component

**Files:**
- Create: `src/pages/AdminCustomerMessagingPage.tsx`

**Step 1: Write component structure**

```typescript
import React, { useState } from 'react';
import { useCustomerSearch } from '@/hooks/useCustomerSearch';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { renderTemplate } from '@/lib/renderMessageTemplate';
import { useUser as useClerkUser } from '@clerk/clerk-react';
import { getClerkToken } from '@/lib/auth-token';

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
}

interface Order {
  id: string;
  total_amount: number;
  created_at: string;
}

interface Message {
  id: string;
  sent_at: string;
  subject: string;
  template_id: string;
  sent_by_user_id: string;
}

const AdminCustomerMessagingPage = () => {
  const { user } = useClerkUser();
  const { results: customerResults, search, isLoading: isSearching } = useCustomerSearch();
  const { toast } = useToast();

  // State
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<string>('');
  const [customSubject, setCustomSubject] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  // Load templates on mount
  React.useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    const { data } = await supabase
      .from('admin_message_templates')
      .select('*')
      .eq('is_active', true);
    setTemplates(data || []);
  };

  const handleCustomerSelect = async (customer: any) => {
    setSelectedCustomer(customer);
    setSelectedOrder('');

    // Load customer's recent orders
    const { data: orderData } = await supabase
      .from('orders')
      .select('id, total_amount, created_at')
      .eq('user_id', customer.id)
      .order('created_at', { ascending: false })
      .limit(10);

    setOrders(orderData || []);

    // Load message history
    const { data: messageData } = await supabase
      .from('customer_messages')
      .select('*')
      .eq('user_id', customer.id)
      .order('sent_at', { ascending: false });

    setMessages(messageData || []);
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template && template.name !== 'Custom Message') {
      // Pre-fill with template preview
      const variables: any = {};
      if (selectedCustomer) variables.customer_name = selectedCustomer.full_name;
      if (selectedOrder) {
        const order = orders.find(o => o.id === selectedOrder);
        if (order) {
          variables.order_id = selectedOrder;
          variables.order_total = order.total_amount.toString();
          variables.order_date = new Date(order.created_at).toLocaleDateString();
        }
      }
      setCustomSubject(renderTemplate(template.subject, variables));
      setCustomMessage(renderTemplate(template.body, variables));
    } else {
      setCustomSubject('');
      setCustomMessage('');
    }
  };

  const handleSendMessage = async () => {
    if (!selectedCustomer || !customSubject || !customMessage) {
      toast({
        title: 'Missing information',
        description: 'Please select a customer and provide subject/message',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);

    try {
      const token = await getClerkToken();
      const response = await fetch(
        `${supabase.supabaseUrl}/functions/v1/send-admin-customer-message`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recipientEmail: selectedCustomer.email,
            subject: customSubject,
            messageBody: customMessage,
            userId: selectedCustomer.id,
            templateId: selectedTemplate,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      toast({
        title: 'Message sent',
        description: `Message sent to ${selectedCustomer.email}`,
      });

      // Clear form and reload messages
      setCustomSubject('');
      setCustomMessage('');
      setSelectedTemplate('');
      await handleCustomerSelect(selectedCustomer);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Customer Messaging</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Customer Search */}
        <div className="lg:col-span-1">
          <Card className="p-4">
            <h2 className="font-semibold mb-4">Find Customer</h2>
            <Input
              placeholder="Email, name, or phone..."
              onChange={(e) => search(e.target.value)}
              className="mb-4"
            />

            {isSearching && <p className="text-sm text-gray-500">Searching...</p>}

            <div className="space-y-2">
              {customerResults.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => handleCustomerSelect(customer)}
                  className={`w-full text-left p-2 rounded border ${
                    selectedCustomer?.id === customer.id
                      ? 'border-food-red bg-food-red/10'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium">{customer.full_name}</div>
                  <div className="text-sm text-gray-600">{customer.email}</div>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Right: Message Composer */}
        {selectedCustomer && (
          <div className="lg:col-span-2">
            <Tabs defaultValue="send" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="send">Send Message</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>

              <TabsContent value="send" className="space-y-4">
                <Card className="p-4">
                  <div className="space-y-4">
                    {/* Order selector */}
                    <div>
                      <label className="text-sm font-medium">Related Order (Optional)</label>
                      <Select value={selectedOrder} onValueChange={setSelectedOrder}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select order..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {orders.map((order) => (
                            <SelectItem key={order.id} value={order.id}>
                              Order {order.id.slice(0, 8)} (${order.total_amount})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Template selector */}
                    <div>
                      <label className="text-sm font-medium">Template</label>
                      <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select template..." />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Subject input */}
                    <div>
                      <label className="text-sm font-medium">Subject</label>
                      <Input
                        value={customSubject}
                        onChange={(e) => setCustomSubject(e.target.value)}
                        placeholder="Email subject..."
                      />
                    </div>

                    {/* Message input */}
                    <div>
                      <label className="text-sm font-medium">Message</label>
                      <textarea
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                        className="w-full h-32 p-2 border rounded"
                        placeholder="Message body..."
                      />
                    </div>

                    {/* Send button */}
                    <Button
                      onClick={handleSendMessage}
                      disabled={isSending}
                      className="w-full bg-food-red hover:bg-food-red/90"
                    >
                      {isSending ? 'Sending...' : 'Send Message'}
                    </Button>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="history">
                <Card className="p-4">
                  {messages.length === 0 ? (
                    <p className="text-gray-500">No messages sent yet</p>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((message) => (
                        <div key={message.id} className="border rounded p-3 hover:bg-gray-50">
                          <div className="font-medium">{message.subject}</div>
                          <div className="text-sm text-gray-600">
                            {new Date(message.sent_at || '').toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCustomerMessagingPage;
```

**Step 2: Verify component syntax**

Run: `cat src/pages/AdminCustomerMessagingPage.tsx | head -50`

Expected: React component with proper imports and structure

---

### Task 8: Add route to admin navigation

**Files:**
- Modify: `src/App.tsx` (around line 150-200 with other admin routes)

**Step 1: Add import**

After other admin page imports, add:

```typescript
import AdminCustomerMessagingPage from "./pages/AdminCustomerMessagingPage";
```

**Step 2: Add route**

In the Routes section, add:

```jsx
<Route path="/admin/customer-messages" element={
  <AdminGuard>
    <AdminCustomerMessagingPage />
  </AdminGuard>
} />
```

**Step 3: Verify syntax**

Run: `npx tsc --noEmit`

Expected: No TypeScript errors

---

### Task 9: Add navigation link in AdminSidebar

**Files:**
- Modify: `src/components/admin/AdminSidebar.tsx`

**Step 1: Find the navigation section**

Look for where marketing/messaging routes are defined (around line 100-150)

**Step 2: Add messaging link**

Add this item to the navigation structure:

```tsx
{
  icon: Mail,
  label: "Customer Messages",
  href: "/admin/customer-messages",
  badge: "New",
},
```

**Step 3: Verify component renders**

Run: `npm run dev` (in separate terminal)

Expected: Dev server starts without errors

---

## Phase 4: Testing & Integration

### Task 10: Manual testing checklist

**Files:** None - manual QA

**Steps:**

1. **Test customer search**
   - Navigate to `/admin/customer-messages`
   - Search for customer by email (e.g., "bishwas")
   - Verify results appear and click to select

2. **Test template selection**
   - Select "Payment Failed - Manual Refund" template
   - Verify subject/message preview shows with placeholders replaced
   - Verify {customer_name}, {order_id}, {order_total} are rendered

3. **Test custom message**
   - Select "Custom Message" template
   - Type custom subject and message
   - Verify ability to send

4. **Test email sending**
   - Send test message to yourself
   - Verify email arrives at your inbox
   - Verify BCC sent to admin email
   - Check Supabase dashboard for new customer_message record

5. **Test message history**
   - Click "History" tab
   - Verify sent message appears with correct date/time
   - Verify ability to view full message

6. **Test error handling**
   - Try sending without selecting a customer
   - Verify error toast appears
   - Try sending with empty message
   - Verify error toast appears

---

### Task 11: Final commit

**Files:** All modified

**Step 1: Review all changes**

Run: `git status`

Expected: Shows migrations, functions, components, and route changes

**Step 2: Stage changes**

```bash
git add -A
```

**Step 3: Create commit message**

```bash
git commit -m "feat: add admin customer messaging system

- Create admin_message_templates table with pre-seeded templates
- Create customer_messages table for audit/history logging
- Add send-admin-customer-message Supabase function
- Implement AdminCustomerMessagingPage with search, compose, history
- Add template rendering with placeholder support
- Email delivery via Resend with admin BCC
- Full message history tracking for audit trail

Addresses: Allow admins to send templated messages for order/payment issues"
```

**Step 4: Verify commit**

Run: `git log --oneline -1`

Expected: Shows new commit message

---

## Database Schema Summary

### admin_message_templates
```
id (UUID) - PK
name (TEXT)
subject (TEXT)
body (TEXT)
is_active (BOOLEAN)
created_at (TIMESTAMP)
```

### customer_messages
```
id (UUID) - PK
user_id (TEXT) - FK profiles
order_id (UUID) - FK orders (nullable)
template_id (UUID) - FK admin_message_templates
subject (TEXT)
message_body (TEXT)
sent_at (TIMESTAMP, nullable)
sent_by_user_id (TEXT)
created_at (TIMESTAMP)
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Migrations fail | Check Supabase migration status in dashboard |
| Email not sending | Verify RESEND_API_KEY in Supabase env vars |
| TypeScript errors | Run `npx tsc --noEmit` to see full errors |
| Component not rendering | Check Admin access/permissions |
| Placeholders not replacing | Check variable names in renderTemplate utility |

---

## Files Modified/Created Summary

**Created:**
- `supabase/migrations/20260327000002_create_message_templates_table.sql`
- `supabase/migrations/20260327000003_create_customer_messages_table.sql`
- `supabase/functions/send-admin-customer-message/index.ts`
- `src/pages/AdminCustomerMessagingPage.tsx`
- `src/hooks/useCustomerSearch.ts`
- `src/lib/renderMessageTemplate.ts`

**Modified:**
- `src/integrations/supabase/types.ts` (add table types)
- `src/App.tsx` (add route + import)
- `src/components/admin/AdminSidebar.tsx` (add nav link)

**Total Lines of Code:** ~800
**Estimated Time:** 2-3 hours
