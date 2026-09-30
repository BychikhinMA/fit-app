import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Elevation, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Нижняя шторка: подложка на весь экран, на широком экране — не шире 480, прокручивается. */
export function Sheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: ReactNode }) {
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Закрыть" />
        <ScrollView
          style={[styles.sheet, { backgroundColor: theme.background }, Elevation.card]}
          contentContainerStyle={styles.sheetContent}>
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    flexGrow: 0,
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    alignSelf: 'center',
    borderTopLeftRadius: Radius.card,
    borderTopRightRadius: Radius.card,
  },
  sheetContent: { padding: Spacing.four, gap: Spacing.three },
});
