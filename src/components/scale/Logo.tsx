import logoAsset from "@/assets/fr-logo.png.asset.json";

export function Logo({ className = "h-8 w-auto" }: { className?: string }) {
  return <img src={logoAsset.url} alt="Fully Resourced" className={className} />;
}