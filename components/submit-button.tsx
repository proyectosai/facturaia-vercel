"use client";

import { useFormStatus } from "react-dom";

import { Button, type ButtonProps } from "@/components/ui/button";

type SubmitButtonProps = ButtonProps & {
  pendingLabel?: string;
};

export function SubmitButton({
  children,
  pendingLabel = "Procesando...",
  disabled,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending || disabled} {...props}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
