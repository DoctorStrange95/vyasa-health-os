import { Construction } from 'lucide-react';

export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
      <Construction className="w-12 h-12 mb-4 text-slate-200" />
      <h2 className="font-bold text-slate-600 text-lg">{title}</h2>
      <p className="text-sm mt-1">Coming soon — in active development</p>
    </div>
  );
}
