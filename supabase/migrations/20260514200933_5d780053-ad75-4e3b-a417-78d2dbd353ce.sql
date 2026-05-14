
-- Admin allowlist: only these emails can have coach role
CREATE OR REPLACE FUNCTION public.is_admin_email(_email text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT lower(_email) IN ('rich@richlohman.com', 'pierre@tovnamedia.com')
$$;

-- Update new user handler: grant coach role to allowlisted emails, assessee otherwise
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, first_name, last_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'phone'
  );

  IF public.is_admin_email(NEW.email) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'coach')
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'assessee')
    ON CONFLICT DO NOTHING;
    INSERT INTO public.assessee_status (assessee_id, status) VALUES (NEW.id, 'New')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Retroactively: grant coach role to existing admin emails, strip assessee
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'coach'::app_role FROM auth.users u
WHERE public.is_admin_email(u.email)
ON CONFLICT (user_id, role) DO NOTHING;

DELETE FROM public.user_roles
WHERE role = 'assessee'
  AND user_id IN (SELECT id FROM auth.users WHERE public.is_admin_email(email));

-- Strip coach role from anyone NOT on the allowlist (defense in depth)
DELETE FROM public.user_roles
WHERE role = 'coach'
  AND user_id NOT IN (SELECT id FROM auth.users WHERE public.is_admin_email(email));

-- RESTRICTIVE policy: enforce allowlist on user_roles inserts of coach role
CREATE OR REPLACE FUNCTION public.enforce_coach_allowlist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'coach'::app_role THEN
    IF NOT EXISTS (
      SELECT 1 FROM auth.users WHERE id = NEW.user_id AND public.is_admin_email(email)
    ) THEN
      RAISE EXCEPTION 'Email not on admin allowlist';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_coach_allowlist_trigger ON public.user_roles;
CREATE TRIGGER enforce_coach_allowlist_trigger
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_coach_allowlist();
