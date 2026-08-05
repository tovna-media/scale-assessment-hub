-- The Leaders Edge access-code system has been removed. Founding is now the
-- only paid entry point in the app, so nothing needs to know whether someone
-- "redeemed a code" anymore.

DROP TABLE IF EXISTS public.redemption_codes;
