"use client";

import { useFormStatus } from "react-dom";

export function DeleteButton({
  confirmText,
  label = "Sil",
  className = "text-sm text-red-600 hover:text-red-800",
}: {
  confirmText: string;
  label?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`${className} transition-all active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60`}
      onClick={(event) => {
        if (!confirm(confirmText)) {
          event.preventDefault();
        }
      }}
    >
      {pending ? "Siliniyor..." : label}
    </button>
  );
}
