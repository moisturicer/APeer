import { Library } from 'lucide-react';

export function Footer() {
  return (
    <footer className="py-12 border-t border-[color:var(--color-border)] mt-20 bg-[color:var(--color-surface)]">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[color:var(--color-primary)] flex items-center justify-center">
            <Library className="text-white w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-[color:var(--color-primary)]">APeer</span>
          <span className="text-xs text-zinc-400 ml-4">Built on Cardano for the Global Knowledge Economy</span>
        </div>
        <div className="flex gap-8 text-xs font-semibold text-zinc-400 tracking-wider">
          {['Documentation', 'Treasury', 'Community', 'Status'].map((link) => (
            <a
              key={link}
              href="#"
              className="hover:text-[color:var(--color-primary)] transition-colors uppercase"
            >
              {link}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
