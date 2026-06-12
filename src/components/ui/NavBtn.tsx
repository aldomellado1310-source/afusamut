import type { LucideIcon } from 'lucide-react';

interface NavBtnProps {
  tab: string;
  icon: LucideIcon;
  label: string;
  activeTab: string;
  onClick: (tab: string) => void;
}

export default function NavBtn({ tab, icon: Icon, label, activeTab, onClick }: NavBtnProps) {
  return (
    <button
      onClick={() => onClick(tab)}
      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-3 transition-all ${
        activeTab === tab
          ? 'bg-amber-500 text-emerald-950 shadow-sm'
          : 'hover:bg-emerald-900/60 text-emerald-100'
      }`}
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span>{label}</span>
    </button>
  );
}
