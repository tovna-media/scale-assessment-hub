import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/checkout')({
  component: CheckoutLayout,
});

function CheckoutLayout() {
  return <Outlet />;
}