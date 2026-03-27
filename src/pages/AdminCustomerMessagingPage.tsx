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
import { Mail, Search, AlertCircle, CheckCircle2, MessageSquare, History, User, Calendar } from 'lucide-react';

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
  fulfillment_status: string;
}

interface Message {
  id: string;
  sent_at: string;
  subject: string;
  message_body: string;
  template_id: string;
  sent_by_user_id: string;
}

const AdminCustomerMessagingPage = () => {
  const { results: customerResults, search, isLoading: isSearching, error: searchError } = useCustomerSearch();
  const { toast } = useToast();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<string>('');
  const [customSubject, setCustomSubject] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [expandedMessage, setExpandedMessage] = useState<string | null>(null);

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
        title: 'Error loading templates',
        description: 'Failed to load message templates',
        variant: 'destructive',
      });
    }
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    search(value);
  };

  const handleCustomerSelect = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setSelectedOrder('');
    setCustomSubject('');
    setCustomMessage('');
    setSelectedTemplate('');

    try {
      // Load customer's recent orders and message history
      const [orderResponse, messageResponse] = await Promise.allSettled([
        supabase
          .from('orders')
          .select('id, total_amount, created_at, fulfillment_status')
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
        setOrders(orderResponse.value.data);
      }
      if (messageResponse.status === 'fulfilled' && messageResponse.value.data) {
        setMessages(messageResponse.value.data);
      }
    } catch (err) {
      console.error('Error loading customer data:', err);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template && template.name !== 'Custom Message') {
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
        title: 'Success',
        description: `Message sent to ${selectedCustomer.email}`,
      });

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2 flex items-center gap-3">
            <Mail className="text-food-red w-8 h-8" />
            Customer Messaging
          </h1>
          <p className="text-slate-600">Send templated messages to customers for order updates and support</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left: Customer Search */}
          <div className="lg:col-span-1">
            <Card className="shadow-lg border-0 sticky top-6">
              <div className="p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-food-red" />
                  Find Customer
                </h2>

                {/* Search Input */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <Input
                    placeholder="Email, name, or phone..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10 bg-slate-50 border-slate-200"
                  />
                  {isSearching && <div className="absolute right-3 top-3 animate-spin text-food-red">⟳</div>}
                </div>

                {/* Error Message */}
                {searchError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                    <AlertCircle className="w-4 h-4 inline mr-2" />
                    {searchError}
                  </div>
                )}

                {/* Results */}
                {searchQuery && customerResults.length === 0 && !isSearching && (
                  <div className="text-center py-8 text-slate-500">
                    <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No customers found</p>
                  </div>
                )}

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {customerResults.map((customer) => (
                    <button
                      key={customer.id}
                      onClick={() => handleCustomerSelect(customer)}
                      className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                        selectedCustomer?.id === customer.id
                          ? 'bg-food-red text-white shadow-md'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-900 border border-slate-200'
                      }`}
                    >
                      <div className="font-semibold text-sm">{customer.full_name}</div>
                      <div className="text-xs opacity-75 truncate">{customer.email}</div>
                      {customer.phone_number && (
                        <div className="text-xs opacity-75">{customer.phone_number}</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* Right: Message Composer */}
          {selectedCustomer ? (
            <div className="lg:col-span-3">
              {/* Customer Info Banner */}
              <Card className="shadow-lg border-0 mb-6 bg-gradient-to-r from-slate-50 to-slate-100">
                <div className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-slate-600 uppercase tracking-wide">Name</p>
                      <p className="font-semibold text-slate-900">{selectedCustomer.full_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 uppercase tracking-wide">Email</p>
                      <p className="font-mono text-sm text-slate-900 truncate">{selectedCustomer.email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 uppercase tracking-wide">Phone</p>
                      <p className="font-semibold text-slate-900">{selectedCustomer.phone_number || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 uppercase tracking-wide">Orders</p>
                      <p className="font-semibold text-slate-900">{orders.length}</p>
                    </div>
                  </div>
                </div>
              </Card>

              <Tabs defaultValue="send" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-slate-100">
                  <TabsTrigger value="send" className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Send Message
                  </TabsTrigger>
                  <TabsTrigger value="history" className="flex items-center gap-2">
                    <History className="w-4 h-4" />
                    History ({messages.length})
                  </TabsTrigger>
                </TabsList>

                {/* Send Message Tab */}
                <TabsContent value="send" className="space-y-4">
                  <Card className="shadow-lg border-0 p-6">
                    {/* Template Selector */}
                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-slate-900 mb-2">
                        Message Template
                      </label>
                      <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                        <SelectTrigger className="bg-slate-50 border-slate-200">
                          <SelectValue placeholder="Choose a template..." />
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

                    {/* Order Selector */}
                    {orders.length > 0 && (
                      <div className="mb-6">
                        <label className="block text-sm font-semibold text-slate-900 mb-2">
                          Related Order (Optional)
                        </label>
                        <Select value={selectedOrder} onValueChange={setSelectedOrder}>
                          <SelectTrigger className="bg-slate-50 border-slate-200">
                            <SelectValue placeholder="Select an order..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">None</SelectItem>
                            {orders.map((order) => (
                              <SelectItem key={order.id} value={order.id}>
                                Order {order.id.slice(0, 8).toUpperCase()} • ${order.total_amount} • {new Date(order.created_at).toLocaleDateString()}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Subject Input */}
                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-slate-900 mb-2">
                        Subject
                      </label>
                      <Input
                        value={customSubject}
                        onChange={(e) => setCustomSubject(e.target.value)}
                        placeholder="Email subject..."
                        className="bg-slate-50 border-slate-200"
                      />
                    </div>

                    {/* Message Input */}
                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-slate-900 mb-2">
                        Message
                      </label>
                      <textarea
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                        placeholder="Message body..."
                        className="w-full h-40 p-3 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-food-red focus:border-transparent resize-none"
                      />
                      <p className="text-xs text-slate-500 mt-2">
                        {customMessage.length} characters
                      </p>
                    </div>

                    {/* Message Preview */}
                    {customSubject && customMessage && (
                      <Card className="bg-blue-50 border-blue-200 mb-6">
                        <div className="p-4">
                          <p className="text-xs text-blue-600 font-semibold mb-2">📧 Preview</p>
                          <p className="text-sm font-semibold text-blue-900">{customSubject}</p>
                          <p className="text-sm text-blue-800 mt-2 whitespace-pre-wrap">{customMessage}</p>
                        </div>
                      </Card>
                    )}

                    {/* Send Button */}
                    <Button
                      onClick={handleSendMessage}
                      disabled={isSending || !customSubject || !customMessage}
                      className="w-full bg-food-red hover:bg-food-red/90 text-white font-semibold py-2 h-auto disabled:opacity-50"
                    >
                      {isSending ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin">⟳</div>
                          Sending...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          Send Message
                        </div>
                      )}
                    </Button>
                  </Card>
                </TabsContent>

                {/* History Tab */}
                <TabsContent value="history">
                  <Card className="shadow-lg border-0 p-6">
                    {messages.length === 0 ? (
                      <div className="text-center py-12 text-slate-500">
                        <History className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <p className="text-sm">No messages sent yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {messages.map((message) => (
                          <Card
                            key={message.id}
                            className="border-slate-200 hover:border-food-red/30 cursor-pointer transition-colors"
                            onClick={() => setExpandedMessage(expandedMessage === message.id ? null : message.id)}
                          >
                            <div className="p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-slate-900 text-sm">{message.subject}</p>
                                  <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(message.sent_at || '').toLocaleString()}
                                  </p>
                                </div>
                                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                              </div>
                              {expandedMessage === message.id && (
                                <div className="mt-4 pt-4 border-t border-slate-200">
                                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{message.message_body}</p>
                                </div>
                              )}
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="lg:col-span-3">
              <Card className="shadow-lg border-0 flex items-center justify-center h-96">
                <div className="text-center">
                  <Mail className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p className="text-slate-500 text-lg">Select a customer to send a message</p>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminCustomerMessagingPage;
