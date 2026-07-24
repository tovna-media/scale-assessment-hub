CREATE TABLE public.success_image_reads (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, read_date)
);
GRANT SELECT, INSERT ON public.success_image_reads TO authenticated;
GRANT ALL ON public.success_image_reads TO service_role;
ALTER TABLE public.success_image_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own success image reads" ON public.success_image_reads
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert own success image reads" ON public.success_image_reads
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);