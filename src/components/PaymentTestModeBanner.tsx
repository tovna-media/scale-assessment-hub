const publishableKey = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

export function PaymentTestModeBanner() {
  if (!publishableKey) {
    return (
      <div className="w-full border-b border-red-300 bg-red-100 px-4 py-2 text-center text-sm text-red-800">
        Production checkout is not yet configured. Complete Stripe go-live to accept real payments.
      </div>
    );
  }
  if (publishableKey.startsWith("pk_test_")) {
    return (
      <div className="w-full border-b border-orange-300 bg-orange-100 px-4 py-2 text-center text-sm text-orange-800">
        Test mode — no real payment will be charged. Use card 4242 4242 4242 4242.
      </div>
    );
  }
  return null;
}
