create table if not exists public.food_track (
  id bigint primary key generated always as identity,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_email text not null,
  dish text not null,
  macro_nutrients jsonb not null,
  health_score real not null,
  
  constraint food_track_user_email_fkey foreign key (user_email) references auth.users(email) on delete cascade
);

-- Create an index on user_email for faster lookups
create index if not exists food_track_user_email_idx on public.food_track(user_email);

-- Enable RLS
alter table public.food_track enable row level security;

-- Create policies
create policy "Users can insert their own food entries"
  on public.food_track for insert
  with check (auth.jwt() ->> 'email' = user_email);

create policy "Users can view their own food entries"
  on public.food_track for select
  using (auth.jwt() ->> 'email' = user_email); 