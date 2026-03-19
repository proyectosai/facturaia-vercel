"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function CopyLinkButton({
  value,
  label = "Copiar enlace",
  variant = "outline",
}: {
  value: string;
  label?: string;
  variant?: "default" | "secondary" | "outline" | "ghost";
}) {
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Enlace copiado al portapapeles.");
    } catch {
      toast.error("No se ha podido copiar el enlace.");
    }
  }

  return (
    <Button type="button" variant={variant} onClick={() => void handleCopy()}>
      <Copy className="h-4 w-4" />
      {label}
    </Button>
  );
}
