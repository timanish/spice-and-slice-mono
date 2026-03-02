import { SonnerToaster } from "@/components/ui/sonner-toaster";

export function Root({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <SonnerToaster />
    </>
  );
}