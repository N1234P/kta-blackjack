export default function Footer() {
  return (
    <footer className="border-t border-[--color-border] py-6">
      <div className="container text-xs text-[--color-muted] flex flex-wrap items-center justify-between gap-2">
        <span>© {new Date().getFullYear()} Keeta Network — Frontend only (no wagering).</span>
        <nav className="flex gap-4">
          <a className="hover:text-white" href="#">Terms</a>
          <a className="hover:text-white" href="#">Privacy</a>
          <a className="hover:text-white" href="#">Support</a>
        </nav>
      </div>
    </footer>
  );
}
