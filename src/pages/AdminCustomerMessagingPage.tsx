import { useState, useEffect } from 'react';
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
import { renderTemplate, type TemplateVariables } from '@/lib/renderMessageTemplate';
import { getClerkToken } from '@/lib/auth-token';

interface Customer {
  id: string;
  email: string;
  full_name: string;
  phone_number: string;
}

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
  const { results: customerResults, search, isLoading: isSearching } = useCustomerSearch();
  const { toast } = useToast();

  // State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<string>('');
  const [customSubject, setCustomSubject] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_message_templates')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      setTemplates(data || []);
    } catch (err) {
      console.error('Error loading templates:', err);
      toast({
        title: 'Error',
        description: 'Failed to load message templates',
        variant: 'destructive',
      });
    }
  };

  const handleCustomerSelect = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setSelectedOrder('');

    try {
      // Load customer's recent orders and message history in parallel
      const [orderResponse, messageResponse] = await Promise.allSettled([
        supabase
          .from('orders')
          .select('id, total_amount, created_at')
          .eq('user_id', customer.id)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('customer_messages')
          .select('*')
          .eq('user_id', customer.id)
          .order('sent_at', { ascending: false }),
      ]);

      if (orderResponse.status === 'fulfilled' && orderResponse.value.data) {
        setOrders(orderResponse.value.data || []);
      } else if (orderResponse.status === 'rejected') {
        console.error('Error loading orders:', orderResponse.reason);
      }

      if (messageResponse.status === 'fulfilled' && messageResponse.value.data) {
        setMessages(messageResponse.value.data || []);
      } else if (messageResponse.status === 'rejected') {
        console.error('Error loading messages:', messageResponse.reason);
      }
    } catch (err) {
      console.error('Error loading customer data:', err);
      toast({
        title: 'Error',
        description: 'Failed to load customer data',
        variant: 'destructive',
      });
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template && template.name !== 'Custom Message') {
      // Pre-fill with template preview
      const variables: TemplateVariables = {};
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
            orderId: selectedOrder || null,
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
              aria-label="Search customers by email, name, or phone"
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
                      <label htmlFor="order-select" className="text-sm font-medium">Related Order (Optional)</label>
                      <Select value={selectedOrder} onValueChange={setSelectedOrder}>
                        <SelectTrigger id="order-select">
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
                      <label htmlFor="template-select" className="text-sm font-medium">Template</label>
                      <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                        <SelectTrigger id="template-select">
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
                      <label htmlFor="subject-input" className="text-sm font-medium">Subject</label>
                      <Input
                        id="subject-input"
                        value={customSubject}
                        onChange={(e) => setCustomSubject(e.target.value)}
                        placeholder="Email subject..."
                      />
                    </div>

                    {/* Message input */}
                    <div>
                      <label htmlFor="message-textarea" className="text-sm font-medium">Message</label>
                      <textarea
                        id="message-textarea"
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
                            {new Date(message.sent_at ? message.sent_at : new Date()).toLocaleString()}
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
