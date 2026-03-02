import { z } from "zod";
import { MenuItem } from "@/hooks/products/types";

// Define form schema
export const cateringFormSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters",
  }),
  email: z.string().email({
    message: "Invalid email address",
  }),
  phone: z.string().min(10, {
    message: "Phone number must be at least 10 digits",
  }),
  eventDate: z.string().min(1, {
    message: "Event date is required",
  }),
  eventTime: z.string().min(1, {
    message: "Event time is required",
  }),
  guestCount: z.string().min(1, {
    message: "Guest count is required",
  }),
  eventType: z.string().min(1, {
    message: "Event type is required",
  }),
  venue: z.string().min(1, {
    message: "Venue information is required",
  }),
  dietaryRestrictions: z.string(),
  additionalInfo: z.string().optional(),
});

export type CateringFormValues = z.infer<typeof cateringFormSchema>;

export interface SelectedMenuItem {
  menuItem: MenuItem;
  quantity: number;
}

export interface GroupedMenuItems {
  [key: string]: MenuItem[];
}

export const spiceLevels = [
  {
    id: "mild",
    name: "Mild",
  },
  {
    id: "medium",
    name: "Medium",
  },
  {
    id: "spicy",
    name: "Spicy",
  },
  {
    id: "extra_spicy",
    name: "Extra Spicy (Nepali Style)",
  },
];
