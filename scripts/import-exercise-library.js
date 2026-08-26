#!/usr/bin/env node

// Разовый импорт data/exercise_library.json в таблицу exercise_library.
// Запуск: node --env-file=.env scripts/import-exercise-library.js
// Нужен SUPABASE_SERVICE_ROLE_KEY (см. .env.example) — таблица read-only для
// anon (см. supabase/migrations/0002_exercise_library.sql), пишет в неё
// только этот скрипт. Идемпотентно: upsert по id, можно перезапускать.

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const DATA_PATH = path.join(__dirname, '..', 'data', 'exercise_library.json');
const BATCH_SIZE = 200;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Не найден ${name}. Запусти: node --env-file=.env scripts/import-exercise-library.js`);
    process.exit(1);
  }
  return value;
}

async function main() {
  const supabaseUrl = requireEnv('EXPO_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  const exercises = JSON.parse(raw);
  console.log(`Прочитано ${exercises.length} упражнений из ${DATA_PATH}`);

  const rows = exercises.map((ex) => ({
    id: ex.id,
    name_ru: ex.name_ru,
    category_ru: ex.category_ru ?? null,
    level_ru: ex.level_ru ?? null,
    equipment_ru: ex.equipment_ru ?? null,
    primary_muscles_ru: ex.primary_muscles_ru ?? [],
    secondary_muscles_ru: ex.secondary_muscles_ru ?? [],
    instructions_ru: ex.instructions_ru ?? null,
    instructions_en: ex.instructions_en ?? [],
    images: ex.images ?? [],
  }));

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('exercise_library').upsert(batch, { onConflict: 'id' });
    if (error) {
      console.error(`Ошибка на батче ${i}-${i + batch.length}:`, error.message);
      process.exit(1);
    }
    console.log(`Загружено ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}`);
  }

  console.log('Импорт завершён.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
