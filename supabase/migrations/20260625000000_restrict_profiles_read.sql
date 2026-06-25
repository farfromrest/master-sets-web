drop policy "profiles are public read" on public.profiles;

create policy "authenticated users can read profiles"
  on public.profiles for select
  to authenticated
  using (true);
