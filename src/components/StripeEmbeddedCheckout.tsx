import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe";

/**
 * Renders Stripe's payment form inline. `fetchClientSecret` must be a stable
 * callback — a new provider options object on every render remounts the
 * provider and Stripe throws "cannot change the client secret after creation".
 */
export function StripeEmbeddedCheckout({
  fetchClientSecret,
}: {
  fetchClientSecret: () => Promise<string>;
}) {
  return (
    <div id="checkout" className="w-full">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
