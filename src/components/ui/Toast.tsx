import { AlertCircle, CheckCircle2 } from 'lucide-react';

export interface ToastData {
  message: string;
  type: 'success' | 'error';
}

interface ToastProps {
  toast: ToastData | null;
}

export default function Toast({ toast }: ToastProps) {
  if (!toast) return null;

  return (
    <div className={`fixed bottom-6 right-6 z-[100] px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 transition-all duration-300 text-sm font-semibold max-w-sm ${
      toast.type === 'error'
        ? 'bg-red-600 text-white'
        : 'bg-emerald-900 text-emerald-50 border border-emerald-700'
    }`}>
      {toast.type === 'error'
        ? <AlertCircle className="w-5 h-5 shrink-0" />
        : <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
      {toast.message}
    </div>
  );
}
