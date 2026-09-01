import { Ionicons } from '@expo/vector-icons';

export type NavItem = {
  /** Stable id, matches the <TabTrigger name> in the hidden TabList. */
  name: string;
  /** Route the TabList trigger points at. */
  href: import('expo-router').Href;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { name: 'home', href: '/(tabs)/home', label: 'Главная', icon: 'home-outline' },
  { name: 'workouts', href: '/(tabs)/workouts', label: 'Тренировки', icon: 'barbell-outline' },
  { name: 'nutrition', href: '/(tabs)/nutrition', label: 'Питание', icon: 'restaurant-outline' },
  { name: 'library', href: '/(tabs)/library', label: 'Библиотека', icon: 'library-outline' },
  { name: 'profile', href: '/(tabs)/profile', label: 'Профиль', icon: 'person-outline' },
] as const;
