create extension if not exists "pgcrypto";

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  teacher_id uuid,
  roll_count integer not null default 40,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key,
  name text,
  role text not null check (role in ('admin', 'teacher')),
  assigned_class_id uuid references public.classes(id),
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  roll_number integer not null check (roll_number between 1 and 40),
  name text not null,
  parent_phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (class_id, roll_number)
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  date date not null,
  statuses jsonb not null default '{}'::jsonb,
  submitted_at timestamptz,
  editable_until timestamptz,
  locked boolean not null default false,
  marked_by uuid not null references public.users(id),
  role text not null check (role in ('admin', 'teacher', 'substitute')),
  created_at timestamptz not null default now(),
  sms_sent_at timestamptz,
  unique (class_id, date)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid not null references public.attendance(id) on delete cascade,
  timestamp timestamptz not null default now(),
  user_id uuid not null references public.users(id),
  change text not null
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid references public.attendance(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  reminder_type text not null check (reminder_type in ('assembly_due', 'draft_pending', 'before_lock')),
  sent_to uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  unique (attendance_id, reminder_type, sent_to)
);

alter table public.classes enable row level security;
alter table public.users enable row level security;
alter table public.students enable row level security;
alter table public.attendance enable row level security;
alter table public.audit_logs enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notification_logs enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.can_edit_teacher_record(target public.attendance)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role = 'teacher'
      and u.assigned_class_id = target.class_id
      and target.date = current_date
      and coalesce(target.locked, false) = false
      and (target.editable_until is null or now() <= target.editable_until)
  );
$$;

create policy "classes read"
on public.classes for select
using (public.is_admin() or teacher_id = auth.uid());

create policy "users read"
on public.users for select
using (id = auth.uid() or public.is_admin());

create policy "students read"
on public.students for select
using (
  public.is_admin()
  or class_id = (select assigned_class_id from public.users where id = auth.uid())
);

create policy "students admin manage"
on public.students for all
using (public.is_admin())
with check (public.is_admin());

create policy "attendance read"
on public.attendance for select
using (
  public.is_admin()
  or class_id = (select assigned_class_id from public.users where id = auth.uid())
);

create policy "attendance insert"
on public.attendance for insert
with check (
  public.is_admin()
  or (
    class_id = (select assigned_class_id from public.users where id = auth.uid())
    and date = current_date
  )
);

create policy "attendance update"
on public.attendance for update
using (public.is_admin() or public.can_edit_teacher_record(attendance))
with check (public.is_admin() or public.can_edit_teacher_record(attendance));

create policy "audit select"
on public.audit_logs for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.attendance a
    join public.users u on u.id = auth.uid()
    where a.id = attendance_id and u.assigned_class_id = a.class_id
  )
);

create policy "audit insert"
on public.audit_logs for insert
with check (public.is_admin() or user_id = auth.uid());

create policy "push own"
on public.push_subscriptions for all
using (public.is_admin() or user_id = auth.uid())
with check (public.is_admin() or user_id = auth.uid());

create policy "notifications admin read"
on public.notification_logs for select
using (public.is_admin());

create or replace function public.write_audit_log(target_attendance_id uuid, actor_id uuid, message text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (attendance_id, user_id, change)
  values (target_attendance_id, actor_id, message);
end;
$$;

create or replace function public.load_attendance(target_class_id uuid, target_date date)
returns setof public.attendance
language sql
security definer
set search_path = public
as $$
  select *
  from public.attendance
  where class_id = target_class_id and date = target_date;
$$;

create or replace function public.autosave_attendance(
  target_class_id uuid,
  target_date date,
  next_statuses jsonb,
  actor_id uuid,
  actor_role text
)
returns public.attendance
language plpgsql
security definer
set search_path = public
as $$
declare
  existing public.attendance;
begin
  insert into public.attendance (class_id, date, statuses, marked_by, role)
  values (target_class_id, target_date, next_statuses, actor_id, actor_role)
  on conflict (class_id, date) do update
    set statuses = excluded.statuses,
        marked_by = excluded.marked_by,
        role = excluded.role
  returning * into existing;

  perform public.write_audit_log(existing.id, actor_id, 'Autosaved attendance statuses');
  return existing;
end;
$$;

create or replace function public.submit_attendance(target_attendance_id uuid, actor_id uuid, actor_role text)
returns public.attendance
language plpgsql
security definer
set search_path = public
as $$
declare
  updated public.attendance;
  base_time timestamptz := now();
begin
  update public.attendance
  set submitted_at = coalesce(submitted_at, base_time),
      editable_until = base_time + interval '90 minutes',
      marked_by = actor_id,
      role = actor_role
  where id = target_attendance_id
  returning * into updated;

  perform public.write_audit_log(updated.id, actor_id, 'Attendance submitted or updated');
  return updated;
end;
$$;

create or replace function public.unlock_attendance(target_attendance_id uuid, actor_id uuid)
returns public.attendance
language plpgsql
security definer
set search_path = public
as $$
declare
  updated public.attendance;
begin
  update public.attendance
  set locked = false,
      sms_sent_at = null,
      editable_until = now() + interval '90 minutes',
      marked_by = actor_id
  where id = target_attendance_id
  returning * into updated;

  perform public.write_audit_log(updated.id, actor_id, 'Attendance unlocked by admin');
  return updated;
end;
$$;

create or replace function public.update_students(target_class_id uuid, payload jsonb)
returns setof public.students
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
begin
  if not public.is_admin() then
    raise exception 'Only admin can update students';
  end if;

  for item in select * from jsonb_array_elements(payload)
  loop
    update public.students
    set name = item->>'name',
        roll_number = (item->>'roll_number')::integer,
        parent_phone = item->>'parent_phone',
        active = (item->>'active')::boolean
    where id = (item->>'id')::uuid
      and class_id = target_class_id;
  end loop;

  return query
  select * from public.students
  where class_id = target_class_id
  order by roll_number;
end;
$$;
