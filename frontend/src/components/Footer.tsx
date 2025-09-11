import Link from "next/link";
import Image from "next/image";

const navPrimary = [
  { href: "/", label: "Home" },
  { href: "/games", label: "Games" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/account", label: "Account" },
];

const navLegal = [
  { href: "#", label: "Terms" },
  { href: "#", label: "Privacy" },
  { href: "#", label: "Responsible Play" },
];

const socials = [
  { href: "#", label: "X", icon: XIcon },
  { href: "#", label: "Discord", icon: DiscordIcon },
  { href: "#", label: "GitHub", icon: GitHubIcon },
];

export default function Footer() {
  return (
    <footer className="relative mt-10">
      {/* soft glow band */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-10 h-10 bg-gradient-to-b from-white/10 to-transparent"
      />
      {/* surface */}
      <div className="border-t border-white/10 bg-black/40 backdrop-blur-md supports-[backdrop-filter]:bg-black/30">
        <div className="container">
          {/* top row */}
          <div className="py-8 lg:py-10 grid grid-cols-1 md:grid-cols-[1.2fr_1fr_1fr] gap-8">
            {/* brand */}
            <div className="flex items-start gap-3">
              <Image
                src="/keeta-logo.png" // put cleaned logo in /public
                alt="Keeta logo"
                width={36}
                height={36}
                className="h-9 w-9 rounded-full ring-1 ring-white/10 bg-black"
                priority
              />
              <div>
                <div className="text-lg font-extrabold tracking-tight">
                  Keeta <span className="text-white/70">Network</span>
                </div>
                <p className="mt-1 text-sm text-white/60 max-w-md">
                  Fast, fair, and polished on-chain games. Blackjack today—more titles tomorrow.
                </p>

                {/* socials */}
                <div className="mt-3 flex items-center gap-2">
                  {socials.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={label}
                      href={href}
                      aria-label={label}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <Icon className="h-4.5 w-4.5 text-white/80" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* nav: product */}
            <nav aria-label="Primary" className="grid gap-2 content-start">
              <h3 className="text-xs uppercase tracking-wider text-white/50">Explore</h3>
              <ul className="mt-1.5 grid gap-1.5 text-sm">
                {navPrimary.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="inline-flex items-center gap-2 text-white/80 hover:text-white"
                    >
                      <span className="inline-block h-1 w-1 rounded-full bg-white/25" />
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* nav: legal */}
            <nav aria-label="Legal" className="grid gap-2 content-start">
              <h3 className="text-xs uppercase tracking-wider text-white/50">Legal</h3>
              <ul className="mt-1.5 grid gap-1.5 text-sm">
                {navLegal.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-white/80 hover:text-white"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* divider */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          {/* bottom row */}
          <div className="py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-white/60">
            <div>© {new Date().getFullYear()} Keeta Network. All rights reserved.</div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="text-white/70">Fair play · 3:2 Blackjack</span>
              </span>
              <Link href="/games" className="text-white/80 hover:text-white">Lobby</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* --- Inline icons (no deps) --- */
function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M4 4l16 16M20 4L4 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
function DiscordIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M20 5.5A16.5 16.5 0 0015.5 4l-.7 1.3a14.4 14.4 0 00-5.6 0L8.5 4A16.5 16.5 0 004 5.5C2.2 8.2 1.8 11 2 13.8c2 1.5 3.9 2.4 5.7 2.8l.9-1.4c-.6-.2-1.2-.5-1.8-.8 1.8.8 3.8 1.1 5.2 1.1s3.4-.3 5.2-1.1c-.6.3-1.2.6-1.8.8l.9 1.4c1.8-.4 3.7-1.3 5.7-2.8.2-2.8-.2-5.6-2-8.3zM9.5 12.5c-.7 0-1.3-.6-1.3-1.3s.6-1.2 1.3-1.2 1.3.5 1.3 1.2-.6 1.3-1.3 1.3zm5 0c-.7 0-1.3-.6-1.3-1.3s.6-1.2 1.3-1.2 1.3.5 1.3 1.2-.6 1.3-1.3 1.3z"/>
    </svg>
  );
}
function GitHubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 2a10 10 0 00-3.2 19.5c.5.1.7-.2.7-.5v-1.8c-2.8.6-3.4-1.2-3.4-1.2-.4-1-1-1.2-1-1.2-.8-.6.1-.6.1-.6.9.1 1.4 1 1.4 1 .8 1.4 2.2 1 2.7.8.1-.6.3-1 .6-1.3-2.2-.2-4.5-1.1-4.5-5 0-1.1.4-2 1-2.7-.1-.2-.4-1.3.1-2.7 0 0 .8-.3 2.8 1a9.6 9.6 0 015 0c2-1.3 2.8-1 2.8-1 .5 1.4.2 2.5.1 2.7.7.7 1 1.6 1 2.7 0 3.9-2.3 4.8-4.6 5 .3.3.6.8.6 1.6v2.3c0 .3.2.6.7.5A10 10 0 0012 2z"/>
    </svg>
  );
}
