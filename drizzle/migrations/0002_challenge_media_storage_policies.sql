CREATE POLICY "challenge media read auth" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'challenge-media');
CREATE POLICY "challenge media upload own folder" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'challenge-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "challenge media update own folder" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'challenge-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "challenge media delete own folder" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'challenge-media' AND (storage.foldername(name))[1] = auth.uid()::text);