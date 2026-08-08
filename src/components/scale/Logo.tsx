const SOURCES = {
  wordmark: "/logo-light.png",
  icon: "/logo-icon-dark.png",
} as const;

export function Logo({
  className = "h-8 w-auto",
  variant = "wordmark",
}: {
  className?: string;
  variant?: keyof typeof SOURCES;
}) {
  return <img src={SOURCES[variant]} alt="Fully Resourced" className={className} />;
}
