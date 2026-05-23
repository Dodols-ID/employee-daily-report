-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query)

create table if not exists check_ins (
  id uuid primary key,
  date_key date not null,
  intern_name text not null,
  work_items jsonb not null default '[]'::jsonb,
  submitted_at timestamptz not null default now()
);

create table if not exists check_outs (
  id uuid primary key,
  date_key date not null,
  intern_name text not null,
  done text not null default '',
  blocked text not null default '',
  notes text not null default '',
  submitted_at timestamptz not null default now()
);

create table if not exists kanban_tasks (
  id uuid primary key,
  title text not null,
  due_date date not null,
  status text not null check (status in ('Current', 'Urgent', 'Waiting')),
  department text not null check (
    department in ('College', 'Creative', 'Health', 'Social', 'Maintenance')
  ),
  created_at timestamptz not null default now()
);

create index if not exists idx_check_ins_date on check_ins (date_key);
create index if not exists idx_check_outs_date on check_outs (date_key);
create index if not exists idx_kanban_due on kanban_tasks (due_date);
create index if not exists idx_kanban_status on kanban_tasks (status);

alter table check_ins enable row level security;
alter table check_outs enable row level security;
alter table kanban_tasks enable row level security;

drop policy if exists "Public read write check_ins" on check_ins;
drop policy if exists "Public read write check_outs" on check_outs;
drop policy if exists "Public read write kanban_tasks" on kanban_tasks;

create policy "Public read write check_ins"
  on check_ins for all using (true) with check (true);

create policy "Public read write check_outs"
  on check_outs for all using (true) with check (true);

create policy "Public read write kanban_tasks"
  on kanban_tasks for all using (true) with check (true);
