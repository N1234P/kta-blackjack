export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative mt-10 border-t border-[--color-border]">
      {/* soft glow */}
      <div aria-hidden className="absolute inset-x-0 -top-6 h-6 bg-gradient-to-b from-emerald-400/10 to-transparent" />
      <div className="container py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <span className="text-[--color-muted]">
          © {year} Keeta Network — Frontend only (no wagering).
        </span>
        <nav className="flex items-center gap-4">
          <a className="hover:text-white text-[--color-muted] transition-colors" href="#">
            Terms
          </a>
          <a className="hover:text-white text-[--color-muted] transition-colors" href="#">
            Privacy
          </a>
          <a className="hover:text-white text-[--color-muted] transition-colors" href="#">
            Support
          </a>
        </nav>
      </div>
    </footer>
  );
}
