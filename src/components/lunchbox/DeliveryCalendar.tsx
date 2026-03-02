import { useState } from 'react';
import { DayPicker, DateRange } from 'react-day-picker';
import { format, addDays, isSameDay, isWeekend, isBefore, startOfDay, differenceInHours } from 'date-fns';
import { Calendar as CalendarIcon, Check, X, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import 'react-day-picker/dist/style.css';

interface DeliveryCalendarProps {
  selectedDates: Date[];
  onDatesChange: (dates: Date[]) => void;
  totalDaysAllowed: number;
  isReadOnly?: boolean;
  existingDeliveries?: Array<{
    date: Date;
    status: string;
  }>;
  minDate?: Date;
  maxDate?: Date;
}

const DeliveryCalendar = ({
  selectedDates,
  onDatesChange,
  totalDaysAllowed,
  isReadOnly = false,
  existingDeliveries = [],
  minDate = new Date(),
  maxDate = addDays(new Date(), 30),
}: DeliveryCalendarProps) => {
  const [month, setMonth] = useState<Date>(new Date());

  // Use minDate as the earliest selectable date
  const earliestSelectableDate = startOfDay(minDate);
  const now = new Date();

  // Check if a date is within the cutoff window (only for dates before minDate)
  const isWithinCutoff = (date: Date): boolean => {
    // If minDate is in the future, don't apply cutoff to dates after minDate
    if (!isBefore(date, earliestSelectableDate)) return false;
    
    const hoursDifference = differenceInHours(date, now);
    return hoursDifference < 24 && hoursDifference >= 0;
  };

  // Check if a date is selectable
  const isDateSelectable = (date: Date): boolean => {
    const dateStart = startOfDay(date);
    
    // Can't select dates before minDate
    if (isBefore(dateStart, earliestSelectableDate)) return false;
    
    // Can't select weekends
    if (isWeekend(date)) return false;
    
    // Can't select dates beyond max date
    if (isBefore(maxDate, date)) return false;
    
    return true;
  };

  // Check if date is selected
  const isSelected = (date: Date): boolean => {
    return selectedDates.some(selected => isSameDay(selected, date));
  };

  // Get existing delivery for a date
  const getDeliveryStatus = (date: Date) => {
    return existingDeliveries.find(d => isSameDay(d.date, date))?.status;
  };

  // Handle date click
  const handleDateClick = (date: Date) => {
    if (isReadOnly || !isDateSelectable(date)) return;

    const isCurrentlySelected = isSelected(date);

    if (isCurrentlySelected) {
      // Remove date
      onDatesChange(selectedDates.filter(d => !isSameDay(d, date)));
    } else {
      // Add date if within limit
      if (selectedDates.length < totalDaysAllowed) {
        onDatesChange([...selectedDates, date]);
      }
    }
  };

  // Custom day component with beautiful styling
  const CustomDay = ({ date }: { date: Date }) => {
    const selected = isSelected(date);
    const selectable = isDateSelectable(date);
    const withinCutoff = isWithinCutoff(date);
    const isPast = isBefore(date, startOfDay(new Date()));
    const isWeekendDay = isWeekend(date);
    const deliveryStatus = getDeliveryStatus(date);

    const baseClasses = "relative w-full h-full flex items-center justify-center rounded-lg transition-all duration-200";
    
    let dayClasses = baseClasses;
    let showIcon = false;
    let iconColor = "";

    // If date is within cutoff or not selectable, don't show as selected/green
    if (withinCutoff || isPast || isWeekendDay || !selectable) {
      dayClasses += " bg-gray-100 text-gray-400 cursor-not-allowed";
    } else if (selected || deliveryStatus) {
      // Only show green if it's actually selectable
      dayClasses += " bg-green-500 text-white font-semibold hover:bg-green-600 ring-2 ring-green-300";
      showIcon = true;
      iconColor = "text-white";
    } else if (isReadOnly) {
      dayClasses += " bg-gray-100 text-gray-400 cursor-not-allowed";
    } else {
      dayClasses += " bg-white hover:bg-green-50 hover:ring-2 hover:ring-green-200 cursor-pointer text-gray-700 font-medium";
    }

    return (
      <div
        onClick={() => handleDateClick(date)}
        className={cn(
          "p-2",
          !selectable && "cursor-not-allowed opacity-50"
        )}
        title={
          isWeekendDay
            ? "Weekends unavailable"
            : withinCutoff
            ? "Within 24hr cutoff - cannot modify"
            : isPast
            ? "Past date"
            : selected
            ? "Click to deselect"
            : "Click to select"
        }
      >
        <div className={dayClasses}>
          <span className="text-sm">{format(date, 'd')}</span>
          {/* {showIcon && (
            <Check className={`absolute top-0.5 right-0.5 h-3 w-3 ${iconColor}`} />
          )} */}
          {/* {withinCutoff && !selected && (
            <AlertCircle className="absolute top-0.5 right-0.5 h-3 w-3 text-orange-500" />
          )} */}
        </div>
      </div>
    );
  };

  const daysRemaining = totalDaysAllowed - selectedDates.length;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <CalendarIcon className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-xl">Delivery Schedule</CardTitle>
              <CardDescription>
                {isReadOnly
                  ? "View your scheduled delivery dates"
                  : "Select your delivery dates (weekdays only)"}
              </CardDescription>
            </div>
          </div>
          <Badge
            variant={daysRemaining === 0 ? "default" : "secondary"}
            className={cn(
              "text-base px-4 py-2",
              daysRemaining === 0 ? "bg-green-500" : "bg-blue-500"
            )}
          >
            {selectedDates.length} / {totalDaysAllowed} days
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Calendar */}
        <div className="flex justify-center">
          <div className="calendar-wrapper">
            <DayPicker
              mode="multiple"
              selected={selectedDates}
              month={month}
              onMonthChange={setMonth}
              disabled={(date) => !isDateSelectable(date)}
              modifiers={{
                selected: selectedDates,
                weekend: isWeekend,
                cutoff: (date) => isWithinCutoff(date),
              }}
              modifiersStyles={{
                selected: { backgroundColor: 'transparent' },
              }}
              components={{
                Day: ({ date }) => <CustomDay date={date} />,
              }}
              className="rounded-lg border border-gray-200 p-4"
              fromDate={minDate}
              toDate={maxDate}
            />
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 justify-center text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500 ring-2 ring-green-300" />
            <span className="text-gray-600">Selected / Scheduled</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-100" />
            <span className="text-gray-600">Unavailable</span>
          </div>
        </div>

        {/* Status message */}
        {!isReadOnly && (
          <div className="text-center">
            {daysRemaining > 0 ? (
              <p className="text-sm text-gray-600">
                Please select <span className="font-semibold text-green-600">{daysRemaining} more {daysRemaining === 1 ? 'day' : 'days'}</span> to complete your schedule
              </p>
            ) : (
              <div className="flex items-center justify-center gap-2 text-green-600">
                <Check className="h-5 w-5" />
                <p className="text-sm font-semibold">All delivery days selected!</p>
              </div>
            )}
          </div>
        )}

        {/* Helper text for cutoff */}
        {!isReadOnly && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <AlertCircle className="inline h-4 w-4 mr-2" />
            Delivery dates must be modified at least 24 hours in advance
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DeliveryCalendar;
