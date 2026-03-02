
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { CateringFormValues, spiceLevels } from './types';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface CateringFormFieldsProps {
  form: UseFormReturn<CateringFormValues>;
  spiceLevel: string;
  setSpiceLevel: (value: string) => void;
}

const CateringFormFields: React.FC<CateringFormFieldsProps> = ({ 
  form,
  spiceLevel,
  setSpiceLevel
}) => {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField control={form.control} name="name" render={({
          field
        }) => <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>} />
        
        <FormField control={form.control} name="email" render={({
          field
        }) => <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="you@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>} />
        
        <FormField control={form.control} name="phone" render={({
          field
        }) => <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input placeholder="(682) 255-5004" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>} />
        
        <FormField control={form.control} name="eventType" render={({
          field
        }) => <FormItem>
                <FormLabel>Event Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="wedding">Wedding</SelectItem>
                    <SelectItem value="corporate">Corporate Event</SelectItem>
                    <SelectItem value="birthday">Birthday Party</SelectItem>
                    <SelectItem value="graduation">Graduation</SelectItem>
                    <SelectItem value="holiday">Holiday Party</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>} />
        
        <FormField control={form.control} name="eventDate" render={({
          field
        }) => <FormItem className="flex flex-col">
                <FormLabel>Event Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button variant={"outline"} className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}>
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={(date: Date | undefined) => field.onChange(date ? date.toISOString() : '')} disabled={(date: Date) => date < new Date(new Date().setHours(0, 0, 0, 0))} initialFocus />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>} />
        
        <FormField control={form.control} name="eventTime" render={({
          field
        }) => <FormItem>
                <FormLabel>Event Time</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>} />
        
        <FormField control={form.control} name="guestCount" render={({
          field
        }) => <FormItem>
                <FormLabel>Number of Guests</FormLabel>
                <FormControl>
                  <Input type="number" min="1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>} />

        <FormField control={form.control} name="venue" render={({
          field
        }) => <FormItem>
                <FormLabel>Event Location/Venue</FormLabel>
                <FormControl>
                  <Input placeholder="Address or venue name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>} />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <FormLabel className="block mb-2">Spice Level</FormLabel>
          <Select value={spiceLevel} onValueChange={value => {
            setSpiceLevel(value);
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Choose spice level" />
            </SelectTrigger>
            <SelectContent>
              {spiceLevels.map(level => <SelectItem key={level.id} value={level.id}>
                  {level.name}
                </SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <FormField control={form.control} name="dietaryRestrictions" render={({
        field
      }) => <FormItem>
              <FormLabel>Dietary Restrictions or Allergies</FormLabel>
              <FormControl>
                <Textarea placeholder="Please let us know about any dietary restrictions or allergies we should be aware of." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>} />
      
      <FormField control={form.control} name="additionalInfo" render={({
        field
      }) => <FormItem>
              <FormLabel>Additional Information</FormLabel>
              <FormControl>
                <Textarea placeholder="Any other details about your event that will help us prepare." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>} />
    </>
  );
};

export default CateringFormFields;
