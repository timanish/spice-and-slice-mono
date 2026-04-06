import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { SUPABASE_URL } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { fetchAllProducts } from '@/hooks/products/useProductFetcher';
import type { Product } from '@/hooks/products/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Clock,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Package,
  CreditCard,
  AlertTriangle,
  RotateCcw,
  Plus,
  Trash2,
  Search,
  Send,
  X,
  Ban,
} from 'lucide-react';

interface OrderDetails {
  id: string;
  payment_method: 'card' | 'cash';
  fulfillment_type: 'delivery' | 'pickup' | 'nationwide';
  total_amount: number;
  delivery_fee: number;
  discount_amount: number;
  tax_amount: number;
  taxable_amount: number;
  delivery_date?: string;
  delivery_time?: string;
  pickup_date?: string;
  pickup_time?: string;
  delivery_address_line1?: string;
  delivery_city?: string;
  delivery_state?: string;
  delivery_postal_code?: string;
  confirmation_token_expires_at?: string;
}

interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  original_product_id?: string;
  original_product_name?: string;
  quantity: number;
  original_quantity?: number;
  price_per_unit: number;
  tax_amount: number;
}

interface NewItem {
  tempId: string;
  product: {
    id: string;
    name: string;
    price_per_unit: number;
    tax_rate: number | null;
    is_weighted: boolean;
    unit_of_measure: string | null;
  };
  quantity: number;
}

const OrderConfirmPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmittingChanges, setIsSubmittingChanges] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changesSubmitted, setChangesSubmitted] = useState(false);
  const [orderCancelled, setOrderCancelled] = useState(false);

  // Per-item deletion state
  const [deletedItems, setDeletedItems] = useState<Set<string>>(new Set());

  // New items to add
  const [newItems, setNewItems] = useState<NewItem[]>([]);

  // Customer notes
  const [customerNotes, setCustomerNotes] = useState('');

  // Product search
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [productSearchResults, setProductSearchResults] = useState<Product[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch all products for search (cached)
  const { data: allProducts = [] } = useQuery({
    queryKey: ['all-products'],
    queryFn: fetchAllProducts,
    staleTime: 15 * 60 * 1000,
  });

  // Debounced product search
  useEffect(() => {
    if (!productSearchTerm.trim()) {
      setProductSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    const timer = setTimeout(() => {
      const term = productSearchTerm.toLowerCase();
      const results = allProducts
        .filter((p) => p.name.toLowerCase().includes(term) && p.is_active)
        .slice(0, 8);
      setProductSearchResults(results);
      setShowSearchDropdown(results.length > 0);
    }, 300);

    return () => clearTimeout(timer);
  }, [productSearchTerm, allProducts]);

  // Check if token is expired
  const isTokenExpired = order?.confirmation_token_expires_at
    ? new Date(order.confirmation_token_expires_at) < new Date()
    : false;

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId || !token) {
        setError('Invalid confirmation link');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch(
          `${SUPABASE_URL}/functions/v1/confirm-customer-order`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId, token, action: 'get' }),
          }
        );

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Failed to load order details');
        }

        const result = await response.json();

        if (result.success && result.order) {
          setOrder(result.order);

          const formatted = result.orderItems.map((item: any) => ({
            id: item.id,
            product_id: item.product_id,
            product_name: item.products?.name || 'Product',
            original_product_id: item.original_product_id ?? undefined,
            original_product_name: item.original_product_name ?? undefined,
            quantity: item.quantity,
            original_quantity: item.original_quantity,
            price_per_unit: item.price_per_unit,
            tax_amount: item.tax_amount,
          }));

          setOrderItems(formatted);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        console.error('Error fetching order:', err);
        setError(err instanceof Error ? err.message : 'Failed to load order details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, token]);

  const handleConfirm = async () => {
    if (!orderId || !token) return;

    setIsConfirming(true);
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/confirm-customer-order`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, token }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to confirm order');
      }

      const result = await response.json();

      if (result.paymentMethod === 'card' && result.stripeUrl) {
        window.location.href = result.stripeUrl;
      } else if (result.paymentMethod === 'cash') {
        toast({
          title: 'Order Confirmed!',
          description: 'Your order has been confirmed and is being prepared.',
        });
        setTimeout(() => navigate('/order-success'), 1500);
      }
    } catch (err) {
      console.error('Confirmation error:', err);
      toast({
        title: 'Confirmation Failed',
        description: err instanceof Error ? err.message : 'Failed to confirm order',
        variant: 'destructive',
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const handleToggleDeleteItem = (itemId: string) => {
    setDeletedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setProductSearchTerm(product.name);
    setShowSearchDropdown(false);
    setNewItemQuantity(1);
  };

  const handleAddNewItem = () => {
    if (!selectedProduct) return;

    setNewItems((prev) => [
      ...prev,
      {
        tempId: crypto.randomUUID(),
        product: {
          id: selectedProduct.id,
          name: selectedProduct.name,
          price_per_unit: selectedProduct.price_per_unit,
          tax_rate: selectedProduct.tax_rate,
          is_weighted: selectedProduct.is_weighted,
          unit_of_measure: selectedProduct.unit_of_measure,
        },
        quantity: newItemQuantity,
      },
    ]);

    setSelectedProduct(null);
    setProductSearchTerm('');
    setProductSearchResults([]);
    setShowSearchDropdown(false);
    setNewItemQuantity(1);
  };

  const handleRemoveNewItem = (tempId: string) => {
    setNewItems((prev) => prev.filter((i) => i.tempId !== tempId));
  };

  const handleSubmitChanges = async () => {
    if (!orderId || !token) return;

    setIsSubmittingChanges(true);
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/confirm-customer-order`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId,
            token,
            action: 'submit_modifications',
            modifications: {
              deletedItemIds: Array.from(deletedItems),
              newItems: newItems.map((i) => ({
                productId: i.product.id,
                quantity: i.quantity,
              })),
              customerNotes: customerNotes.trim() || undefined,
            },
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to submit changes');
      }

      setChangesSubmitted(true);
    } catch (err) {
      toast({
        title: 'Submission Failed',
        description: err instanceof Error ? err.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingChanges(false);
    }
  };

  const handleCancel = async () => {
    if (!orderId || !token) return;
    setIsCancelling(true);
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/confirm-customer-order`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, token, action: 'cancel' }),
        }
      );
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to cancel order');
      }
      setOrderCancelled(true);
    } catch (err) {
      toast({
        title: 'Cancellation Failed',
        description: err instanceof Error ? err.message : 'Please try again or contact support',
        variant: 'destructive',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const hasAnyChanges =
    deletedItems.size > 0 || newItems.length > 0 || customerNotes.trim().length > 0;

  // --- Early return states ---

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Navigation />
        <div className="container max-w-2xl mx-auto px-4 py-16">
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-900">
                <AlertTriangle className="h-5 w-5" />
                Invalid Confirmation Link
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-700 mb-4">
                This confirmation link is missing or invalid. Please check your email for the correct link.
              </p>
              <Button onClick={() => navigate('/')} className="w-full">
                Return Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Navigation />
        <div className="container max-w-2xl mx-auto px-4 py-16">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-12 bg-gray-300 rounded-full w-12 mx-auto mb-6"></div>
              <div className="h-6 bg-gray-300 rounded w-48 mx-auto mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-64 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Navigation />
        <div className="container max-w-2xl mx-auto px-4 py-16">
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-900">Error</CardTitle>
              <CardDescription className="text-red-700">
                {error || 'Order not found'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/')} className="w-full">
                Return Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isTokenExpired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Navigation />
        <div className="container max-w-2xl mx-auto px-4 py-16">
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-900">
                <Clock className="h-5 w-5" />
                Confirmation Link Expired
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-orange-700 mb-4">
                This confirmation link has expired. Confirmation links are valid for 48 hours.
              </p>
              <p className="text-orange-700 mb-6">
                Please contact us at{' '}
                <a href="mailto:spiceandslicedfw@gmail.com" className="font-semibold underline hover:no-underline">
                  spiceandslicedfw@gmail.com
                </a>{' '}
                to confirm your order.
              </p>
              <Button onClick={() => navigate('/')} className="w-full">
                Return Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Post-submit success state
  if (changesSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Navigation />
        <div className="container max-w-2xl mx-auto px-4 py-16">
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-green-100 rounded-full">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
              </div>
              <CardTitle className="text-center text-green-900 text-2xl">Changes Submitted!</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-green-800 mb-6">
                We've received your modifications. Our team will review and send you a new confirmation email shortly.
              </p>
              <Button onClick={() => navigate('/')} className="w-full">
                Return Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (orderCancelled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Navigation />
        <div className="container max-w-2xl mx-auto px-4 py-16">
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-red-100 rounded-full">
                  <Ban className="h-10 w-10 text-red-600" />
                </div>
              </div>
              <CardTitle className="text-center text-red-900 text-2xl">Order Cancelled</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-red-800 mb-6">
                Your order has been cancelled. You'll receive a confirmation email shortly.
              </p>
              <Button onClick={() => navigate('/')} className="w-full">
                Return Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const subtotal = order.taxable_amount;
  const hasAdjustments = orderItems.some(
    (item) =>
      (item.original_quantity && item.original_quantity !== item.quantity) ||
      (item.original_product_id && item.original_product_id !== item.product_id)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navigation />
      <div className="container max-w-3xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-orange-100 rounded-full">
              <Package className="h-8 w-8 text-orange-700" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Review & Confirm Your Order
          </h1>
          <p className="text-lg text-gray-600">
            Order #<span className="font-mono font-semibold">{orderId?.substring(0, 8).toUpperCase()}</span>
          </p>
        </div>

        {/* Adjustments Notice */}
        {hasAdjustments && (
          <Card className="mb-8 border-orange-200 bg-orange-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-orange-900 mb-1">Items Adjusted by Our Team</p>
                  <p className="text-orange-800 text-sm">
                    Some items were adjusted based on available inventory. You can accept them as-is, remove any items you don't want, or add new items — then click <strong>Submit Changes for Review</strong>.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order Items */}
        {orderItems.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {orderItems.map((item) => {
                  const isAdminAdjusted =
                    (item.original_quantity && item.original_quantity !== item.quantity) ||
                    (item.original_product_id && item.original_product_id !== item.product_id);
                  const isDeleted = deletedItems.has(item.id);

                  return (
                    <div
                      key={item.id}
                      className={`flex justify-between items-start py-4 border-b last:border-b-0 transition-colors ${
                        isDeleted ? 'bg-red-50 -mx-4 px-4 rounded opacity-60' : ''
                      }`}
                    >
                      <div className="flex-grow mr-4">
                        {/* Product name — show substitution if applicable */}
                        {item.original_product_name && item.original_product_id !== item.product_id ? (
                          <p className={`font-medium ${isDeleted ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                            <span className="line-through text-gray-400">{item.original_product_name}</span>
                            {!isDeleted && (
                              <>
                                {' → '}
                                <span className="font-bold text-orange-600">{item.product_name}</span>
                              </>
                            )}
                          </p>
                        ) : (
                          <p className={`font-medium ${isDeleted ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                            {item.product_name}
                          </p>
                        )}

                        {/* Quantity */}
                        <p className="text-sm text-gray-600 mt-1">
                          {isAdminAdjusted && item.original_quantity && item.original_quantity !== item.quantity ? (
                            <>
                              <span className="line-through text-gray-400">{item.original_quantity}</span>
                              {' → '}
                              <span className="font-bold text-orange-600">{item.quantity}</span>
                            </>
                          ) : (
                            <span>{item.quantity}</span>
                          )}
                          {' × $'}
                          {item.price_per_unit.toFixed(2)}
                        </p>

                        {isDeleted && (
                          <p className="text-xs text-red-600 mt-1">Will be removed from order</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className={`font-semibold ${isDeleted ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                            ${(item.quantity * item.price_per_unit).toFixed(2)}
                          </p>
                        </div>

                        {/* Delete / Restore toggle */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleDeleteItem(item.id)}
                          className={`p-1 h-auto ${isDeleted ? 'text-gray-500 hover:text-gray-700' : 'text-red-400 hover:text-red-600 hover:bg-red-50'}`}
                          title={isDeleted ? 'Restore item' : 'Remove item'}
                        >
                          {isDeleted ? <RotateCcw className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pricing Summary */}
        <Card className="mb-8 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle>Pricing Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-gray-700">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {order.delivery_fee > 0 && (
              <div className="flex justify-between text-gray-700">
                <span>Delivery Fee</span>
                <span>${order.delivery_fee.toFixed(2)}</span>
              </div>
            )}
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-green-700">
                <span>Discount</span>
                <span>-${order.discount_amount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-700">
              <span>Tax</span>
              <span>${order.tax_amount.toFixed(2)}</span>
            </div>
            <Separator className="bg-blue-200" />
            <div className="flex justify-between font-bold text-lg text-gray-900">
              <span>Total</span>
              <span className="text-blue-600">${order.total_amount.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Fulfillment Details */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Fulfillment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Type:</span>
              <span className="font-medium capitalize">{order.fulfillment_type}</span>
            </div>

            {order.fulfillment_type === 'delivery' && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">Delivery Date:</span>
                  <span className="font-medium">{order.delivery_date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Delivery Time:</span>
                  <span className="font-medium">{order.delivery_time}</span>
                </div>
                {order.delivery_address_line1 && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-gray-600 mb-2">Delivery Address:</p>
                    <p className="font-medium">
                      {order.delivery_address_line1}
                      <br />
                      {order.delivery_city}, {order.delivery_state} {order.delivery_postal_code}
                    </p>
                  </div>
                )}
              </>
            )}

            {order.fulfillment_type === 'pickup' && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pickup Date:</span>
                  <span className="font-medium">{order.pickup_date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pickup Time:</span>
                  <span className="font-medium">{order.pickup_time}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ─── New Items Added ─── */}
        {newItems.length > 0 && (
          <Card className="mb-8 border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-900">
                <Plus className="h-5 w-5" />
                Items You're Adding
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {newItems.map((item) => (
                  <div key={item.tempId} className="flex items-center justify-between py-2 border-b last:border-b-0">
                    <div>
                      <p className="font-medium text-gray-900">{item.product.name}</p>
                      <p className="text-sm text-gray-600">
                        {item.quantity} × ${item.product.price_per_unit.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-green-700">
                        ${(item.quantity * item.product.price_per_unit).toFixed(2)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveNewItem(item.tempId)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 h-auto"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── Add an Item ─── */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Add an Item
            </CardTitle>
            <CardDescription>
              Search for items to add to your order. They'll be reviewed by our team.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Search products..."
                    value={productSearchTerm}
                    onChange={(e) => {
                      setProductSearchTerm(e.target.value);
                      if (selectedProduct && e.target.value !== selectedProduct.name) {
                        setSelectedProduct(null);
                      }
                    }}
                    onFocus={() => productSearchResults.length > 0 && setShowSearchDropdown(true)}
                    className="pl-9"
                  />
                  {productSearchTerm && (
                    <button
                      onClick={() => {
                        setProductSearchTerm('');
                        setSelectedProduct(null);
                        setShowSearchDropdown(false);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Search dropdown */}
              {showSearchDropdown && productSearchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                  {productSearchResults.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleSelectProduct(product)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 flex justify-between items-center border-b last:border-b-0"
                    >
                      <span className="font-medium text-gray-900">{product.name}</span>
                      <span className="text-gray-600 text-sm">
                        ${product.price_per_unit.toFixed(2)}
                        {product.is_weighted ? `/${product.unit_of_measure || 'unit'}` : '/ea'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quantity picker — shown after product selected */}
            {selectedProduct && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium text-gray-900">{selectedProduct.name}</p>
                    <p className="text-sm text-gray-600">${selectedProduct.price_per_unit.toFixed(2)}/ea</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Label className="text-sm text-gray-700 w-16">Quantity:</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNewItemQuantity((q) => Math.max(1, q - 1))}
                      className="h-8 w-8 p-0"
                    >
                      -
                    </Button>
                    <Input
                      type="number"
                      min={1}
                      value={newItemQuantity}
                      onChange={(e) => setNewItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 text-center h-8"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNewItemQuantity((q) => q + 1)}
                      className="h-8 w-8 p-0"
                    >
                      +
                    </Button>
                  </div>
                  <Button onClick={handleAddNewItem} size="sm" className="bg-food-red hover:bg-food-red/90 ml-auto">
                    <Plus className="h-4 w-4 mr-1" />
                    Add to Order
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── Customer Notes ─── */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Notes for Our Team (optional)</CardTitle>
            <CardDescription>
              Any special requests or information about your order changes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="e.g. Please swap the lamb for chicken, or I'd like to add extra naan..."
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </CardContent>
        </Card>

        {/* ─── Action Buttons ─── */}
        <Card className={order.payment_method === 'card' ? 'mb-8 border-blue-200 bg-blue-50' : 'mb-8'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {order.payment_method === 'card' ? (
                <>
                  <CreditCard className="h-5 w-5" />
                  Ready to Pay
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  Confirm Order
                </>
              )}
            </CardTitle>
            <CardDescription>
              {order.payment_method === 'card'
                ? 'Accept all changes and proceed to secure payment'
                : 'Accept all changes and confirm your cash order'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Primary: Accept All */}
            <Button
              size="lg"
              className="w-full"
              onClick={handleConfirm}
              disabled={isConfirming || isSubmittingChanges}
            >
              {isConfirming ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Processing...
                </>
              ) : order.payment_method === 'card' ? (
                <>
                  Confirm & Pay ${order.total_amount.toFixed(2)}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  Confirm Order
                  <CheckCircle className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            {/* Divider */}
            <div className="flex items-center gap-3 py-1">
              <Separator className="flex-1" />
              <span className="text-xs text-gray-400 whitespace-nowrap">or</span>
              <Separator className="flex-1" />
            </div>

            {/* Secondary: Submit Changes */}
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={handleSubmitChanges}
              disabled={isSubmittingChanges || isConfirming || !hasAnyChanges}
            >
              {isSubmittingChanges ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-gray-600 border-t-transparent rounded-full" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Submit Changes for Review
                </>
              )}
            </Button>

            {!hasAnyChanges && (
              <p className="text-xs text-gray-500 text-center">
                Remove items, add products, or add a note above to enable this button.
              </p>
            )}

            <Separator className="my-2" />

            {/* Cancel order */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                  disabled={isCancelling || isConfirming || isSubmittingChanges}
                >
                  <Ban className="h-4 w-4 mr-2" />
                  {isCancelling ? 'Cancelling...' : 'Cancel Order'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently cancel your order. You'll receive a confirmation email.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep Order</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCancel}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Yes, Cancel Order
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* Support Info */}
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="pt-6">
            <p className="text-gray-700 text-sm mb-2">
              <span className="font-semibold">Questions?</span>
            </p>
            <p className="text-gray-600 text-sm">
              Contact us at{' '}
              <a href="mailto:spiceandslicedfw@gmail.com" className="font-medium text-blue-600 hover:underline">
                spiceandslicedfw@gmail.com
              </a>{' '}
              before confirming your order.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OrderConfirmPage;
