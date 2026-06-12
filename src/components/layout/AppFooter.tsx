export function AppFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="hidden lg:block border-t border-slate-200 bg-white px-5 py-2.5 flex-shrink-0">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>© {year} Vyasa Integrated Healthcare · All patient data is encrypted and HIPAA-compliant</span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            System operational
          </span>
          <span>v1.0.0-beta</span>
        </div>
      </div>
    </footer>
  );
}
