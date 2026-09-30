alter table public.questions add column if not exists category text not null default 'general';
alter table public.questions add column if not exists level text not null default 'B1' check (level in ('A1','A2','B1','B2','C1'));
