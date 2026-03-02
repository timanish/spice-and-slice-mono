import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon } from 'lucide-react';
import { useAdminCrud } from '@/hooks/useAdminCrud';
import { useToast } from '@/hooks/use-toast';
import { PromoCode } from '@/types/promoCode';

const formSchema = z.object({
  code: z.string().min(2, {
    message: "Promo code must be at least 2 characters.",
  }).max(20, {
    message: "Promo code must be 20 or fewer characters.",
  }).refine(val => /^[A-Z0-9_]+$/.test(val), {
    message: "Promo code must only contain uppercase letters, numbers, and underscores.",
  }),
  description: z.string().min(5, {
    message: "Description must be at least 5 characters.",
  }).max(255, {
    message: "Description must be 255 or fewer characters.",
  }),
  discountPercentage: z.coerce.number().min(0).max(100).optional(),
  discountAmount: z.coerce.number().min(0).optional(),
  minimumOrderAmount: z.coerce.number().min(0).optional(),
  startDate: z.date(),
  endDate: z.date().optional(),
  maxUses: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().default(true),
  isSitewide: z.boolean().default(true),
});

type PromoCodeFormValues = z.infer<typeof formSchema>;

interface PromoCodeFormProps {
  onSuccess?: () => void;
  initialData?: PromoCode;
}

const PromoCodeForm = ({ onSuccess, initialData }: PromoCodeFormProps) => {
  const { toast } = useToast();
  const { insert, update } = useAdminCrud();
  const isEditMode = !!initialData;
  
  const form = useForm<PromoCodeFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: initialData?.code || '',
      description: initialData?.description || '',
      discountPercentage: initialData?.discount_percentage || 5,
      discountAmount: initialData?.discount_amount || undefined,
      minimumOrderAmount: initialData?.minimum_order_amount || undefined,
      startDate: initialData?.start_date ? new Date(initialData.start_date) : new Date(),
      endDate: initialData?.end_date ? new Date(initialData.end_date) : undefined,
      maxUses: initialData?.max_uses || undefined,
      isActive: initialData?.is_active ?? true,
      isSitewide: initialData?.is_sitewide ?? true,
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [discountType, setDiscountType] = useState(
    initialData?.discount_amount ? 'amount' : 'percentage'
  );

  async function onSubmit(values: PromoCodeFormValues) {
    setIsSubmitting(true);

    try {
      const { code, description, discountPercentage, discountAmount, minimumOrderAmount, 
        startDate, endDate, maxUses, isActive, isSitewide } = values;
      
      const promoData = {
        code,
        description,
        discount_type: discountType,
        discount_percentage: discountType === 'percentage' ? discountPercentage : null,
        discount_amount: discountType === 'amount' ? discountAmount : null,
        minimum_order_amount: minimumOrderAmount || null,
        start_date: startDate.toISOString(),
        end_date: endDate?.toISOString() || null,
        max_uses: maxUses || null,
        is_active: isActive,
        is_sitewide: isSitewide
      };

      // console.log('Submitting promo data:', promoData);
      // console.log('Discount type state:', discountType);

      if (isEditMode) {
        // Update existing promo code
        await update('promo_codes', promoData, [{ column: 'id', operator: 'eq', value: initialData.id }]);
      } else {
        // Create new promo code
        await insert('promo_codes', promoData);
      }

      toast({
        title: isEditMode ? "Promo code updated" : "Promo code created",
        description: `The promo code "${code}" was successfully ${isEditMode ? 'updated' : 'created'}.`,
      });

      if (onSuccess) {
        onSuccess();
      }
      
      // Reset form if creating new promo
      if (!isEditMode) {
        form.reset({
          code: '',
          description: '',
          discountPercentage: 5,
          discountAmount: undefined,
          minimumOrderAmount: undefined,
          startDate: new Date(),
          endDate: undefined,
          maxUses: undefined,
          isActive: true,
          isSitewide: true,
        });
      }
    } catch (error: any) {
      console.error("Error saving promo code:", error);
      toast({
        variant: "destructive",
        title: "Failed to save",
        description: error.message || "There was a problem saving the promo code.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Promo Code</FormLabel>
                <FormControl>
                  <Input placeholder="WELCOME5" {...field} />
                </FormControl>
                <FormDescription>
                  Uppercase letters, numbers, and underscores only.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input placeholder="5% off for new customers" {...field} />
                </FormControl>
                <FormDescription>
                  Brief description of what this promo offers.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Discount Type</label>
            <div className="flex space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  checked={discountType === 'percentage'}
                  onChange={() => setDiscountType('percentage')}
                  className="h-4 w-4"
                />
                <span>Percentage (%)</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  checked={discountType === 'amount'}
                  onChange={() => setDiscountType('amount')}
                  className="h-4 w-4"
                />
                <span>Fixed Amount ($)</span>
              </label>
            </div>
          </div>
          
          {discountType === 'percentage' ? (
            <FormField
              control={form.control}
              name="discountPercentage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Discount Percentage (%)</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" max="100" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <FormField
              control={form.control}
              name="discountAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Discount Amount ($)</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <FormField
          control={form.control}
          name="minimumOrderAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Minimum Order Amount ($)</FormLabel>
              <FormControl>
                <Input type="number" min="0" step="0.01" placeholder="Optional" {...field} />
              </FormControl>
              <FormDescription>
                Leave empty for no minimum order amount.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Start Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>End Date (Optional)</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? format(field.value, "PPP") : <span>No end date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value || undefined}
                      onSelect={field.onChange}
                      disabled={(date) => {
                        const startDate = form.getValues("startDate");
                        return date < startDate;
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  Leave empty for no expiration.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="maxUses"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Maximum Uses (Optional)</FormLabel>
              <FormControl>
                <Input type="number" min="0" step="1" placeholder="Unlimited" {...field} />
              </FormControl>
              <FormDescription>
                Leave empty for unlimited uses.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Active</FormLabel>
                  <FormDescription>
                    Turn off to disable this promo code.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="isSitewide"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Sitewide</FormLabel>
                  <FormDescription>
                    Turn off for user-specific promo codes.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
        
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Saving...' : isEditMode ? 'Update Promo Code' : 'Create Promo Code'}
        </Button>
      </form>
    </Form>
  );
};

export default PromoCodeForm;
