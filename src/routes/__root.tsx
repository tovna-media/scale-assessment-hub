import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground font-display">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SCALE Assessment Hub" },
      { name: "description", content: "Leadership assessments and personalized gap reports from coach Rich Lohman." },
      { name: "author", content: "Rich Lohman" },
      { property: "og:title", content: "SCALE Assessment Hub" },
      { property: "og:description", content: "Leadership assessments and personalized gap reports from coach Rich Lohman." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "SCALE Assessment Hub" },
      { name: "twitter:description", content: "Leadership assessments and personalized gap reports from coach Rich Lohman." },
      { property: "og:image", content: "https://app.getfullyresourced.com/__l5e/assets-v1/9f4757f8-f779-47de-b1b1-7ed6ad25f9bd/og-fully-resourced.jpg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "Fully Resourced" },
      { name: "twitter:image", content: "https://app.getfullyresourced.com/__l5e/assets-v1/9f4757f8-f779-47de-b1b1-7ed6ad25f9bd/og-fully-resourced.jpg" },
      { name: "google-site-verification", content: "K0gDBRRzKKDAfFiwdnH_697-PSQB1F-ev32hm0ykrJQ" },
      { name: "google-site-verification", content: "dAIC3OBsL3HfVSKNw_0mDZdE5hasITvQREyEXkKp0oE" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "preconnect", href: "https://app.coachvox.ai" },
      { rel: "dns-prefetch", href: "https://app.coachvox.ai" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              "name": "Fully Resourced Leadership System",
              "url": "https://app.getfullyresourced.com/",
              "publisher": { "@id": "#organization" },
            },
            {
              "@id": "#organization",
              "@type": "Organization",
              "name": "Lohman Leadership Group",
              "url": "https://app.getfullyresourced.com/",
              "founder": {
                "@type": "Person",
                "name": "Rich Lohman",
              },
            },
          ],
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <Outlet />
      <Toaster richColors position="top-right" />
    </AuthProvider>
  );
}
