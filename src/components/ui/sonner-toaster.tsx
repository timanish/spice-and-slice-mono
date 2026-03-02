
import { Toaster } from "sonner";

export function SonnerToaster() {
  return (
    <Toaster 
      position="bottom-right" 
      theme="light" 
      closeButton
      richColors
      toastOptions={{
        style: {
          borderRadius: "0.5rem",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
        }
      }}
    />
  );
}
