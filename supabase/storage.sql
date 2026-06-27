-- ─────────────────────────────────────────────
-- SUPABASE STORAGE - AVATARS
-- IMPORTANTE: Crear el bucket "avatars" primero desde
-- el dashboard: Storage → New bucket → nombre "avatars" → Public ✓
-- Después correr este SQL en el SQL Editor.
-- ─────────────────────────────────────────────

-- Lectura pública (cualquiera puede ver los avatares)
create policy "Avatars son de acceso público" on storage.objects
  for select using (bucket_id = 'avatars');

-- Subida: solo el dueño de la carpeta
create policy "Usuarios pueden subir su propio avatar" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Actualización: solo el dueño
create policy "Usuarios pueden actualizar su avatar" on storage.objects
  for update using (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Borrado: solo el dueño
create policy "Usuarios pueden borrar su avatar" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
