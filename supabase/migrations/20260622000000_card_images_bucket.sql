insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('card-images', 'card-images', true, 524288, array['image/webp']);

create policy "public read card-images"
  on storage.objects for select
  using (bucket_id = 'card-images');
