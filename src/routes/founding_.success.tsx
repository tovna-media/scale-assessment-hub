import { createFileRoute, redirect } from "@tanstack/react-router";

// Old success URL, kept so previously shared links / in-flight checkouts still work.
// The live page lives at /30-day-trial/success.
export const Route = createFileRoute("/founding_/success")({
  beforeLoad: () => {
    throw redirect({
      to: "/30-day-trial/success",
      search: (prev) => ({
        session_id: typeof prev.session_id === "string" ? prev.session_id : undefined,
      }),
      statusCode: 301,
    });
  },
});
