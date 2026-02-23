interface HeaderProps {
  onTogglePanel: () => void;
}

export function Header({ onTogglePanel }: HeaderProps) {
  return (
    <header className="no-print bg-slate-800 text-white px-4 py-3 lg:px-6 lg:py-4 flex items-center gap-3 landscape-compact">
      <button
        type="button"
        onClick={onTogglePanel}
        className="md:hidden p-2 rounded-md hover:bg-slate-700 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label="Toggle panel"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <div>
        <h1 className="text-lg lg:text-xl font-bold">繼承系統表計算工具</h1>
        <p className="text-slate-300 text-xs lg:text-sm mt-0.5 lg:mt-1 landscape-hide">
          依據台灣民法繼承編，計算法定應繼分與特留分
        </p>
      </div>
    </header>
  );
}
