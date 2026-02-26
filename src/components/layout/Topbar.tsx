// src/components/layout/Topbar.tsx
import NotificationBell from "../notifications/NotificationBell";

export default function Topbar() {
  return (
    <header className="h-16 bg-white flex items-center justify-between px-6 border-b shadow-sm sticky top-0 z-10">
      <div className="text-lg font-semibold text-gray-900">Dashboard</div>
      <div className="flex items-center gap-3">
        <NotificationBell />
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold text-xs">
            D
          </div>
          <span className="hidden sm:block">Daniel</span>
        </div>
      </div>
    </header>
  );
}