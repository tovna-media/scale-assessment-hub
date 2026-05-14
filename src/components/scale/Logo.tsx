import logoUrl from "@/assets/rl-logo.png";

export function Logo({ className = "h-8 w-auto" }: { className?: string }) {
  return <img src={logoUrl} alt="Rich Lohman" className={className} />;
}