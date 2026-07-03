"use client";

export function DeleteButton({
  confirmText,
  label = "Sil",
  className = "text-sm text-red-600 hover:text-red-800",
}: {
  confirmText: string;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(event) => {
        if (!confirm(confirmText)) {
          event.preventDefault();
        }
      }}
    >
      {label}
    </button>
  );
}
