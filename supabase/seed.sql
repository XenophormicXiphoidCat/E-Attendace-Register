-- Replace the UUID values below with real auth.users IDs from your Supabase project.
-- Create those users first in Supabase Auth, then mirror them here.

insert into public.classes (id, name, teacher_id, roll_count, active)
values ('11111111-1111-1111-1111-111111111111', '10M', '22222222-2222-2222-2222-222222222222', 40, true)
on conflict (id) do update
set name = excluded.name,
    teacher_id = excluded.teacher_id,
    roll_count = excluded.roll_count,
    active = excluded.active;

insert into public.users (id, name, role, assigned_class_id, phone)
values
  ('22222222-2222-2222-2222-222222222222', 'Vivaswan Pandey', 'teacher', '11111111-1111-1111-1111-111111111111', '+910000000002'),
  ('33333333-3333-3333-3333-333333333333', 'Admin One', 'admin', null, '+910000000001')
on conflict (id) do update
set name = excluded.name,
    role = excluded.role,
    assigned_class_id = excluded.assigned_class_id,
    phone = excluded.phone;

insert into public.students (class_id, roll_number, name, parent_phone, active)
select
  '11111111-1111-1111-1111-111111111111',
  roll_number,
  'Student ' || lpad(roll_number::text, 2, '0'),
  '+91999999' || lpad(roll_number::text, 4, '0'),
  true
from generate_series(1, 40) as roll_number
on conflict (class_id, roll_number) do update
set name = excluded.name,
    parent_phone = excluded.parent_phone,
    active = excluded.active;
