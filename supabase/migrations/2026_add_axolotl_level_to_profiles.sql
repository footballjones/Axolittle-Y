-- Add axolotl_level to profiles so friends can see each other's current level.
-- Defaults to 1 for existing rows; updated by the client on every cloud sync.
alter table public.profiles
  add column if not exists axolotl_level integer not null default 1;
