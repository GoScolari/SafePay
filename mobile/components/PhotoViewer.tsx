// TODO: Pinch-to-zoom pendiente.
// Se intentó con ScrollView nativo (maximumZoomScale + scrollEnabled en FlatList),
// pero el conflicto entre el scroll horizontal del FlatList paginado y el ScrollView
// interno rompe el comportamiento. Requiere react-native-gesture-handler +
// react-native-reanimated para una solución correcta (GestureDetector + PinchGesture).

import React, { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewToken,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface PhotoViewerProps {
  uris: string[];
  initialIndex?: number;
  visible: boolean;
  onClose: () => void;
  canDelete?: boolean;
  onDelete?: (index: number) => void;
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export function PhotoViewer({
  uris,
  initialIndex = 0,
  visible,
  onClose,
  canDelete = false,
  onDelete,
}: PhotoViewerProps) {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const listRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0]) setCurrentIndex(viewableItems[0].index ?? 0);
    },
  ).current;

  const handleOpen = () => {
    setCurrentIndex(initialIndex);
    setTimeout(() => {
      listRef.current?.scrollToIndex({ index: initialIndex, animated: false });
    }, 50);
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
      onShow={handleOpen}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Text style={styles.counter}>
            {uris.length > 0 ? `${currentIndex + 1} / ${uris.length}` : ''}
          </Text>
          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
            <Feather name="x" size={24} color="#fff" />
          </Pressable>
        </View>

        {/* Galería horizontal */}
        <FlatList
          ref={listRef}
          data={uris}
          keyExtractor={(uri, i) => `${uri}-${i}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({
            length: SCREEN_W,
            offset: SCREEN_W * index,
            index,
          })}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
          renderItem={({ item }) => (
            <View style={styles.slide}>
              <Image
                source={{ uri: item }}
                style={styles.image}
                resizeMode="contain"
              />
            </View>
          )}
        />

        {/* Footer con botón eliminar */}
        {canDelete && onDelete && (
          <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
            <Pressable
              style={styles.deleteBtn}
              onPress={() => onDelete(currentIndex)}
              hitSlop={8}
            >
              <Feather name="trash-2" size={20} color="#fff" />
              <Text style={styles.deleteBtnText}>Eliminar foto</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  counter: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.9,
  },
  closeBtn: {
    position: 'absolute',
    right: 16,
    top: '50%',
  },
  slide: {
    width: SCREEN_W,
    height: SCREEN_H,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_W,
    height: SCREEN_H,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: 'center',
    paddingTop: 12,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239,68,68,0.85)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
  },
  deleteBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default PhotoViewer;
