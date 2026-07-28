import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card no-print">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-6 text-center text-sm text-muted-foreground sm:px-6">
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <Link to="/terms" className="hover:text-foreground transition-colors">
            Terms of Service
          </Link>
          <span aria-hidden className="text-border">
            ·
          </span>
          <Link to="/privacy" className="hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
          <span aria-hidden className="text-border">
            ·
          </span>
          <a
            href="https://richlohman.com"
            className="hover:text-foreground transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            RichLohman.com
          </a>
        </nav>
        <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
          <a
            href="mailto:support@getfullyresourced.com"
            className="hover:text-foreground transition-colors"
          >
            support@getfullyresourced.com
          </a>
          <span aria-hidden className="text-border">
            ·
          </span>
          <span>(616) 299-9165</span>
        </p>
      </div>
    </footer>
  );
}
