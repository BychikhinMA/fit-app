-- Календарь (Часть II.4 roadmap): фиксированный день недели для дня программы.
-- Как применить: Supabase Dashboard -> SQL Editor -> вставить файл целиком -> Run.
--
-- weekday: 0 = понедельник .. 6 = воскресенье, nullable. Программа не имеет
-- даты окончания — день недели повторяется бессрочно, конкретные календарные
-- даты нигде не хранятся, клиент сам сопоставляет дату дню недели.
--
-- Бэкафилл распределяет существующие workout_days по дням недели по порядку
-- (сначала по sort_order фазы, внутри фазы — по sort_order дня), начиная с
-- понедельника, в пределах одной программы. Если у программы больше 7 дней,
-- лишние сядут на тот же день недели, что и более ранние (тот же компромисс,
-- что уже принят для недельной сетки в UI, — программы онбординга создают
-- не больше 7 дней).

alter table workout_days
  add column if not exists weekday int check (weekday is null or weekday between 0 and 6);

with ranked as (
  select wd.id,
         (row_number() over (
           partition by ph.program_id
           order by ph.sort_order, wd.sort_order
         ) - 1) % 7 as wd_index
  from workout_days wd
  join phases ph on ph.id = wd.phase_id
)
update workout_days wd
set weekday = ranked.wd_index
from ranked
where ranked.id = wd.id;
