"use client";

import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        richColors
        closeButton
        position="top-right"
        toastOptions={{
          className: "rounded-[24px]",
        }}
      />
    </>
  );
}
