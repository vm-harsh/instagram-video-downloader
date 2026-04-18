import { AlertTriangle } from 'lucide-react';

export default function ErrorMessage({ message }) {
  if (!message) return null;

  return (
    <div className="panel mx-auto mt-6 flex w-full max-w-4xl items-start gap-3 border border-red-200 bg-red-50 px-4 py-3 text-red-800">
      <AlertTriangle size={20} className="mt-0.5 shrink-0" />
      <p className="text-sm font-medium leading-6">{message}</p>
    </div>
  );
}
