"use client";

import { useEffect, useId } from "react";
import { toast } from "sonner";

export function RouteToast({
  type,
  message,
}: {
  type: "success" | "error" | "info";
  message?: string | null;
}) {
  const toastId = useId();

  useEffect(() => {
    if (!message) {
      return;
    }

    if (type === "success") {
      toast.success(message, { id: toastId });
      return;
    }

    if (type === "error") {
      toast.error(message, { id: toastId });
      return;
    }

    toast(message, { id: toastId });
  }, [message, toastId, type]);

  return null;
}
