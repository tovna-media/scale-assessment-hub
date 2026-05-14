UPDATE storage.buckets SET public = true WHERE id = 'reports';

DROP POLICY IF EXISTS "Public can read reports" ON storage.objects;
CREATE POLICY "Public can read reports"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'reports');