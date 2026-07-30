CREATE OR REPLACE FUNCTION public.enforce_profile_billing_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    NEW.free_pass_used := OLD.free_pass_used;
    NEW.subscribed := OLD.subscribed;
  END IF;
  RETURN NEW;
END;
$function$;