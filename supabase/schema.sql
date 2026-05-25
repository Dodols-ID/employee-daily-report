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

create table if not exists habits (
  id uuid primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists habit_logs (
  id uuid primary key,
  habit_id uuid not null references habits (id) on delete cascade,
  log_date date not null,
  whats_done text not null,
  duration_minutes integer not null default 0,
  what_to_improve text not null default '',
  submitted_at timestamptz not null default now(),
  unique (habit_id, log_date)
);

create index if not exists idx_habit_logs_habit on habit_logs (habit_id);
create index if not exists idx_habit_logs_date on habit_logs (log_date);

alter table habits enable row level security;
alter table habit_logs enable row level security;

drop policy if exists "Public read write habits" on habits;
drop policy if exists "Public read write habit_logs" on habit_logs;

create policy "Public read write habits"
  on habits for all using (true) with check (true);

create policy "Public read write habit_logs"
  on habit_logs for all using (true) with check (true);
