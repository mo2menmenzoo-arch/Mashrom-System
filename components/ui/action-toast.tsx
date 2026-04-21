type ToastState = { msg: string; ok: boolean } | null;

export function ActionToast({ toast }: { toast: ToastState }) {
  if (!toast) return null;
  return (
    <div
      className={`rounded-lg px-4 py-2 text-sm font-medium ${
        toast.ok
          ? "bg-green-500/10 text-green-600"
          : "bg-destructive/10 text-destructive"
      }`}
    >
      {toast.msg}
    </div>
  );
}
