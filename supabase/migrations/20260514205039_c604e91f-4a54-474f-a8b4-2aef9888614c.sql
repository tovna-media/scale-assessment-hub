-- Allow authenticated users (and the SQL roles RLS evaluates as) to call has_role.
-- The function is SECURITY DEFINER and only reads role rows; it is safe to expose.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon, service_role;