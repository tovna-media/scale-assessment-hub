import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { ArrowRight, Brain, Users, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SCALE Assessment Hub — Rich Lohman Leadership Coaching" },
      { name: "description", content: "Take the SCALE assessments to uncover the gaps holding you back as a leader. Get a personalized gap report from coach Rich Lohman." },
    ],
  }),
  component: Index,
});

function Index() {
  const { session, role, loading } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground font-display font-bold">
              S
            </div>
            <div className="font-display text-base font-semibold text-foreground">SCALE</div>
          </div>
          <div className="flex items-center gap-2">
            {!loading && session ? (
              <Button asChild>
                <Link to={role === "coach" ? "/coach" : "/dashboard"}>
                  Go to dashboard
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/login">Log in</Link>
                </Button>
                <Button asChild>
                  <Link to="/signup">Get started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-5xl px-4 pb-20 pt-20 sm:px-6 sm:pt-28">
          <div className="max-w-3xl">
            <p className="font-medium uppercase tracking-widest text-[var(--accent-blue)] text-xs">
              Rich Lohman · Executive Leadership Coaching
            </p>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-tight text-foreground sm:text-6xl">
              Find the gaps holding you back as a leader.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
              Three short assessments. One personalized SCALE Gap Report. A clear next step
              for the leader your business needs you to be.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link to="/signup">
                  Start your assessment <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/login">I already have an account</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-card">
          <div className="mx-auto grid max-w-5xl gap-8 px-4 py-16 sm:px-6 md:grid-cols-3">
            {[
              { icon: Brain, title: "Inner Capacity", text: "Can you handle the weight of leadership?" },
              { icon: Users, title: "Personal Leadership", text: "Can you lead with clarity and consistency?" },
              { icon: BarChart3, title: "Business Audit", text: "Can your business grow without depending on you?" },
            ].map((item) => (
              <div key={item.title} className="flex flex-col gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/5 text-primary">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Rich Lohman Coaching · SCALE Assessment Hub
      </footer>
    </div>
  );
}
