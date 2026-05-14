export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card no-print">
      <div className="mx-auto max-w-7xl px-4 py-6 text-center text-sm text-muted-foreground sm:px-6">
        <p>
          <a href="https://richlohman.com" className="hover:text-foreground transition-colors" target="_blank" rel="noopener noreferrer">
            RichLohman.com
          </a>
          <span className="mx-2">·</span>
          <a href="mailto:rich@richlohman.com" className="hover:text-foreground transition-colors">
            rich@richlohman.com
          </a>
          <span className="mx-2">·</span>
          <span>(616) 299-9165</span>
        </p>
      </div>
    </footer>
  );
}