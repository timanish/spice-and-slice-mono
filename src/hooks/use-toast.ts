
import { toast as sonnerToast } from "sonner";
import * as React from "react";

const TOAST_DURATION = 1500; // Reduced from 3000ms to 1500ms (1.5 seconds)

// Define the options type that includes all the properties we're using
export interface ToastOptions {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  variant?: "default" | "destructive";
  duration?: number;
}

// This is the hook for internal components
export function useToast() {
  const toast = (options: ToastOptions) => {
    return sonnerToast(options.description as string, {
      duration: options.duration || TOAST_DURATION,
      className: options.variant === "destructive" ? "destructive" : undefined,
      // Convert our options to sonner's format
      ...(options.title ? { heading: options.title } : {}),
      ...(options.action ? { action: options.action } : {})
    });
  };

  return {
    toast,
    dismiss: sonnerToast.dismiss,
    error: (message: string, title?: string) => toast({ 
      description: message, 
      variant: "destructive",
      ...(title ? { title } : {})
    }),
    success: (message: string, title?: string) => toast({ 
      description: message,
      ...(title ? { title } : {})
    })
  };
}

// Create a standalone toast function with the same signature
export const toast = (options: ToastOptions) => {
  return sonnerToast(options.description as string, {
    duration: options.duration || TOAST_DURATION,
    className: options.variant === "destructive" ? "destructive" : undefined,
    // Convert our options to sonner's format
    ...(options.title ? { heading: options.title } : {}),
    ...(options.action ? { action: options.action } : {})
  });
};

toast.dismiss = sonnerToast.dismiss;
toast.error = (message: string, title?: string) => toast({ 
  description: message, 
  variant: "destructive",
  ...(title ? { title } : {})
});
toast.success = (message: string, title?: string) => toast({ 
  description: message,
  ...(title ? { title } : {})
});
