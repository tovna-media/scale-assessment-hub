
-- 1) Block privilege escalation on user_roles
-- Drop overly broad coach ALL policy and re-create explicit policies; add restrictive insert guard
DROP POLICY IF EXISTS "coaches manage roles" ON public.user_roles;

CREATE POLICY "coaches insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'coach'::app_role));

CREATE POLICY "coaches update roles"
  ON public.user_roles FOR UPDATE
  USING (public.has_role(auth.uid(), 'coach'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'coach'::app_role));

CREATE POLICY "coaches delete roles"
  ON public.user_roles FOR DELETE
  USING (public.has_role(auth.uid(), 'coach'::app_role));

-- Restrictive policy: even if another permissive policy exists, only coaches can insert
CREATE POLICY "restrict role inserts to coaches"
  ON public.user_roles AS RESTRICTIVE FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'coach'::app_role));

CREATE POLICY "restrict role updates to coaches"
  ON public.user_roles AS RESTRICTIVE FOR UPDATE
  USING (public.has_role(auth.uid(), 'coach'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'coach'::app_role));

-- 2) Add DELETE policy for reports bucket on storage.objects
CREATE POLICY "owners or coaches delete reports"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'reports'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'coach'::app_role)
    )
  );

-- 3) Lock down SECURITY DEFINER has_role function
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
