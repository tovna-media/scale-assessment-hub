import { createFileRoute, redirect } from "@tanstack/react-router";

// Old checkout URL, kept so previously shared links still work.
// The live page lives at /30-day-trial — see that route for the actual content.
export const Route = createFileRoute("/founding")({
  beforeLoad: () => {
    throw redirect({ to: "/30-day-trial", search: true, statusCode: 301 });
  },
});
