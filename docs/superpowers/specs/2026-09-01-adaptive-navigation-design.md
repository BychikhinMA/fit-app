# Дизайн: адаптивная навигация + visual-полировка (Roadmap Шаг 1)

Создано 2026-09-01. Источник решений — `roadmap-auth-ai-design.md`, раздел
«Шаг 1». Здесь — уточнённый и утверждённый пользователем технический дизайн
перед написанием плана реализации.

## Цель

Сейчас в приложении плоский Stack-роутинг (`src/app/_layout.tsx`) и один
экран `plan-ready.tsx`, показывающий сразу всё (ИМТ, калории, дни программы,
пример питания). Пользователь: «дизайн не поменялся», «выглядит слишком
иишно» (нет визуальной иерархии), навигацию хочет «как в официальных
приложениях Apple» — сайдбар слева на широком экране, нижний таб-бар на
узком.

Шаг 1 закрывает две вещи сразу: (1) адаптивная навигация с 5 разделами,
(2) базовая visual-полировка (тени, единые скругления, блюр на барах).
Цветовая тема остаётся монохромной — бело-оранжевый акцент это **Шаг 2**,
отдельно.

## Отличия от роадмапа (осознанные)

1. **Custom tabs из `expo-router/ui`** (`Tabs` / `TabList` / `TabTrigger` /
   `TabSlot`) вместо ручного свапа `<Tabs>` через `useWindowDimensions`.
   Один `<Tabs>`, скрытый `<TabList style={{display:'none'}}>` для конфига
   маршрутов, кастомный бар рядом. `TabTrigger` прокидывает `isFocused` для
   стилизации активного пункта. Меньше кода, чем два разных навигатора.
2. **Иконки `@expo/vector-icons`** (Ionicons) на всех платформах вместо
   `expo-symbols`. `expo-symbols` — iOS-only и НЕ имеет кросс-платформенного
   фолбэка (в роадмапе неточность), на вебе/Android не рендерит ничего.
   Веб сейчас — основная среда разработки, поэтому нужен реально
   кроссплатформенный набор. Нативные SF Symbols на iOS можно вернуть
   позже отдельным улучшением.

## Структура маршрутов

```
src/app/
  _layout.tsx                — корневой Stack: gate-экраны + модалки + (tabs)
  index.tsx                  — выбор профиля; redirect-цель → /(tabs)
  onboarding/index.tsx       — по завершении: router.replace('/(tabs)')
  (tabs)/
    _layout.tsx              — AppShell: <Tabs> + адаптивный бар
    index.tsx                — Главная
    workouts.tsx             — Тренировки
    nutrition.tsx            — Питание
    library.tsx              — Библиотека
    profile.tsx              — Профиль
  workout-day/[id].tsx       — без изменений, stack поверх табов
  exercise-library/index.tsx — остаётся ТОЛЬКО для режима «выбор замены»
                               (?pickForExerciseId=…), stack поверх табов
  exercise-library/[id].tsx  — без изменений, stack поверх табов
```

- `plan-ready.tsx` **удаляется**. Его содержимое переезжает в табы Главная /
  Тренировки / Питание. После онбординга — `router.replace('/(tabs)')`.
- Экран выбора профиля (`index.tsx`) и `onboarding` остаются **вне** `(tabs)`
  как gate до приложения. `index.tsx`: при наличии `profile_settings` →
  `router.replace('/(tabs)')` (было `/plan-ready`), иначе → `/onboarding`.
- `workout-day/[id]` и `exercise-library/[id]` регистрируются в корневом
  `_layout.tsx` как сейчас — открываются stack-экранами поверх таб-шелла.

### Список библиотеки: два входа

Тело списка выносится в `src/components/exercise-library-list.tsx` с пропом
`mode: 'browse' | 'pick'`:

- `(tabs)/library.tsx` рендерит `<ExerciseLibraryList mode="browse" />` —
  без кнопки «Назад», без заголовка-действия, тап по карточке →
  `/exercise-library/[id]` без параметров.
- `exercise-library/index.tsx` рендерит `<ExerciseLibraryList mode="pick" />`
  — сохраняет нынешнее поведение: заголовок «Выбери замену для …»,
  предвыбор фильтра по `muscleGroup`, проброс `pickForExerciseId` в детальный
  экран. Флоу замены из `workout-day/[id]` (`router.push('/exercise-library?
  pickForExerciseId=…')`) не меняется.

Общая логика фильтров/запроса (chips, `.overlaps()`/`.in()`, состояние
`selectedMuscles`/`selectedEquipment`) живёт в компоненте один раз.

## Адаптивный шелл `(tabs)/_layout.tsx`

```tsx
import { Tabs, TabList, TabTrigger, TabSlot } from 'expo-router/ui';
import { useWindowDimensions, View } from 'react-native';

const WIDE_BREAKPOINT = 768;

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const wide = width >= WIDE_BREAKPOINT;

  return (
    <Tabs>
      <View style={{ flex: 1, flexDirection: wide ? 'row' : 'column' }}>
        {wide && <Sidebar />}
        <TabSlot />
        {!wide && <BottomBar />}
      </View>
      <TabList style={{ display: 'none' }}>
        <TabTrigger name="home" href="/(tabs)" />
        <TabTrigger name="workouts" href="/(tabs)/workouts" />
        <TabTrigger name="nutrition" href="/(tabs)/nutrition" />
        <TabTrigger name="library" href="/(tabs)/library" />
        <TabTrigger name="profile" href="/(tabs)/profile" />
      </TabList>
    </Tabs>
  );
}
```

### Общий источник пунктов навигации

`src/components/navigation/nav-items.ts`:

```ts
export const NAV_ITEMS = [
  { name: 'home',      href: '/(tabs)',           label: 'Главная',    icon: 'home-outline' },
  { name: 'workouts',  href: '/(tabs)/workouts',  label: 'Тренировки', icon: 'barbell-outline' },
  { name: 'nutrition', href: '/(tabs)/nutrition', label: 'Питание',    icon: 'restaurant-outline' },
  { name: 'library',   href: '/(tabs)/library',   label: 'Библиотека', icon: 'library-outline' },
  { name: 'profile',   href: '/(tabs)/profile',   label: 'Профиль',    icon: 'person-outline' },
] as const;
```

(Точные имена Ionicons уточняются при реализации.)

### `Sidebar` (`src/components/navigation/sidebar.tsx`)

- Фикс. ширина ~240, `BlurView` фон (`expo-blur`), полная высота, тонкая
  правая граница (`theme.backgroundSelected`).
- Сверху — название приложения (`ThemedText type="subtitle"` или уменьшённый).
- Список из `NAV_ITEMS`: каждый пункт — `<TabTrigger name={item.name} asChild>`
  вокруг `<Pressable>` с иконкой + подписью. Активный (по `isFocused`) —
  подложка `theme.backgroundSelected`, радиус `Radius.row`. В Шаге 2
  подложка станет оранжевой (`accent`), текст/иконка — `onAccent`.

### `BottomBar` (`src/components/navigation/bottom-bar.tsx`)

- `BlurView` фон, `flexDirection: 'row'`, распределение `space-around`.
- Нижний отступ = `useSafeAreaInsets().bottom`.
- Каждый пункт — `<TabTrigger name={item.name} asChild>` вокруг `<Pressable>`
  с иконкой сверху и мелкой подписью снизу; активный по `isFocused` —
  иконка/текст `theme.text` (в Шаге 2 → `accent`), неактивный —
  `textSecondary`.
- Тонкая верхняя граница.

### Обёртка триггера

`src/components/navigation/tab-trigger-button.tsx` — `forwardRef`-компонент,
принимает прокинутые `expo-router/ui` пропы (`isFocused`, `onPress`,
`onLongPress`, ...) плюс `icon`, `label`, `variant: 'sidebar' | 'bottom'`.
Один компонент для обоих баров, чтобы стили активного состояния жили в
одном месте.

## Разнесение контента

Загрузка выносится из `plan-ready.tsx` в `src/lib/load-plan.ts`: экспортирует
`loadPlan(profileId)` и тип `PlanData` (перенести как есть). Каждый таб-экран
делает свой `useEffect` → `loadPlan` → показывает свою часть. Дублирующийся
запрос между табами приемлем на этом этапе (данные небольшие, RLS открыт);
общий кэш — вне объёма Шага 1.

Общий паттерн экрана таба (следует нынешнему `plan-ready.tsx`): `ThemedView`
контейнер → `SafeAreaView` (`edges={['top']}`, низ закрывает бар) →
`ScrollView` с `maxWidth: MaxContentWidth`, по центру → состояния `error` /
загрузка (`ActivityIndicator`) / контент.

| Таб | Файл | Содержимое (из нынешнего `plan-ready.tsx`) |
|---|---|---|
| Главная | `(tabs)/index.tsx` | приветствие; карточка ИМТ (`bmi_value`/`bmi_category` + `BMI_DISCLAIMER`); карточка калорий/БЖУ; «План на сегодня» — первый `workoutDays[0]`, тап → `workout-day/[id]`; плашка «это черновик» при `program?.generation_source === 'stub'` |
| Тренировки | `(tabs)/workouts.tsx` | `program.name` + список всех `workoutDays` (нынешний блок `program &&`), каждая строка — `Pressable` → `workout-day/[id]` |
| Питание | `(tabs)/nutrition.tsx` | `mealPlan` + список `meals` (нынешний блок `mealPlan &&`). Лога еды нет |
| Библиотека | `(tabs)/library.tsx` | `<ExerciseLibraryList mode="browse" />` |
| Профиль | `(tabs)/profile.tsx` | текущий профиль (имя из `PROFILES`-мапы или `profileId`); «Сменить профиль» → `clearStoredProfileId()` + `router.replace('/')`; «Пройти онбординг заново» → `router.push('/onboarding')`; заметка «вход по email и паролю появится позже» |

Кнопки «Библиотека упражнений» и «Сменить профиль», которые сейчас внизу
`plan-ready.tsx`, удаляются — их роль берут табы Библиотека и Профиль.

## Visual-полировка (тема пока монохромная)

`src/constants/theme.ts` — добавить:

```ts
export const Radius = {
  card: 20,   // карточки, крупные блоки (сейчас вперемешку 16)
  row: 14,    // строки меню, мелкие пилюли
  pill: 999,
} as const;

// тень для приподнятых поверхностей; на вебе/iOS — shadow*, на Android — elevation
export const Elevation = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
} as const;
```

(Точные значения тени подбираются вживую при реализации — ориентир: мягкая,
низкоконтрастная, «iOS-масштаб».)

Применение:

- Все карточки `ThemedView type="backgroundElement"` в `(tabs)/*`,
  `workout-day/[id].tsx`, `exercise-library/[id].tsx`, `exercise-library-list`
  — привести `borderRadius` к `Radius.card` и добавить `Elevation.card`.
- `Sidebar` / `BottomBar` — фон `BlurView`, без сплошной заливки.
- **Без новой библиотеки компонентов** (как просит роадмап): нормализуем
  существующие инлайновые `styles.card` в каждом файле, общий `<Card>` не
  вводим. `theme.ts` — единственное новое общее место.
- Проверить, что скругления нигде не остались «вперемешку» (искать
  `Spacing.three` в роли `borderRadius` — заменить на `Radius.*`).

## Зависимости

```
npx expo install expo-blur @expo/vector-icons
```

Обе не установлены, обе Expo-managed под SDK 57. `expo-blur`: на iOS/web
работает из коробки; на Android нужен `BlurTargetView` + `blurMethod` —
поскольку Android сейчас не целевая платформа, для Android допустим
фолбэк на полупрозрачную заливку (`rgba` фон вместо `BlurView`), помечено
`TODO` в коде бара.

## Обработка ошибок

- Каждый таб-экран сохраняет нынешнюю модель `plan-ready.tsx`: `error`-стейт
  → экран с текстом ошибки; нет данных → `ActivityIndicator`.
- Если у профиля ещё нет программы/плана питания (`program`/`mealPlan` =
  `null`) — Тренировки и Питание показывают короткую заглушку «План ещё не
  построен», а не пустоту.
- `(tabs)/_layout.tsx` не грузит данные — только навигация; ошибок не даёт.
- Прямой заход на `/(tabs)` без выбранного профиля: экран Главная проверяет
  `getStoredProfileId()`, если пусто → `router.replace('/')` (как сейчас
  делает `plan-ready.tsx`).

## Тестирование

- `npx tsc --noEmit` и `npx expo lint` — оба чисто (обязательное условие).
- Вживую в браузере (`npx expo start`, dev-сервер уже поднят):
  - широкий экран → сайдбар слева; ресайз окна ниже 768px → нижний таб-бар;
    контент не прыгает, горизонтального скролла нет;
  - все 5 табов открываются, показывают свой контент;
  - активный пункт подсвечен пилюлей и меняется при переключении;
  - `workout-day/[id]` и `exercise-library/[id]` открываются поверх шелла
    (stack), «Назад» возвращает в таб;
  - флоу замены: Тренировки → день → «Заменить» → `exercise-library`
    (pick-режим, фильтр по группе мышц) → карточка → «Выбрать» → возврат на
    день, название обновилось;
  - Библиотека-таб (browse-режим) открывается без кнопки выбора;
  - Профиль: «Сменить профиль» → экран выбора; «Онбординг заново» → онбординг;
  - новый пользователь: выбор профиля → онбординг → сразу табы (не
    `plan-ready`).

## Вне объёма Шага 1

- Бело-оранжевая тема (Шаг 2).
- UI лога съеденного (`food_log_entries`), лог тренировок.
- Реальный ИИ / Edge Function (Шаг 3).
- Авторизация по email/паролю (Шаг 4) — на экране Профиль пока только заметка.
- Нативные SF Symbols на iOS.
- Общий кэш загрузки плана между табами.
