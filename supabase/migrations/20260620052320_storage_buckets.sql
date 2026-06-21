insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('cards', 'cards', true, 5242880, array['application/json']),
  ('logos', 'logos', true, 524288,  array['image/png']);

create policy "public read cards"
  on storage.objects for select
  using (bucket_id = 'cards');

create policy "public read logos"
  on storage.objects for select
  using (bucket_id = 'logos');
