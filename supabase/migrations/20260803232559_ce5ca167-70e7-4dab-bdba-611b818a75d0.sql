select cron.schedule(
  'action-reminders-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--a13a09c8-ada8-4008-9b3f-2c25c691d714.lovable.app/api/public/hooks/action-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer de37f8a9005961a8fe4c726994d8a119c3d2b50a4912adb7b540a657e87dab10'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);