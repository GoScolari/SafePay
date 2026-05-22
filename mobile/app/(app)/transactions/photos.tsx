import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import { useFiles, type FileType } from '@/hooks/useFiles';
import { PhotoViewer } from '@/components/PhotoViewer';
import { Colors } from '@/constants/colors';

export default function PhotosScreen() {
  const { txId, fromCreate, fileType: fileTypeParam, readOnly: readOnlyParam } =
    useLocalSearchParams<{
      txId: string;
      fromCreate?: string;
      fileType?: string;
      readOnly?: string;
    }>();

  const fileType: FileType = (fileTypeParam === 'reception' ? 'reception' : 'publication');
  const isFromCreate = fromCreate === 'true';
  const isReadOnly   = readOnlyParam === 'true';

  const insets = useSafeAreaInsets();
  const pickingRef = useRef(false);
  const { files, isLoading, uploading, deleting, uploadFile, deleteFile } = useFiles(txId ?? '', fileType);

  const [viewerVisible, setViewerVisible]   = useState(false);
  const [viewerIndex, setViewerIndex]       = useState(0);

  const openViewer = (index: number) => {
    setViewerIndex(index);
    setViewerVisible(true);
  };

  const uris = files.map((f) => f.localUri ?? '').filter(Boolean);

  const handleDelete = (index: number) => {
    const file = files[index];
    if (!file) return;
    Alert.alert('Eliminar foto', '¿Seguro que querés eliminar esta foto?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: () => {
          setViewerVisible(false);
          deleteFile(file.id);
        },
      },
    ]);
  };

  const pickImage = async (source: 'gallery' | 'camera') => {
    if (pickingRef.current) return;
    pickingRef.current = true;

    try {
      let result: ImagePicker.ImagePickerResult;
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Permiso requerido', 'Necesitamos acceso a la galería.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      }

      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];

      try {
        await uploadFile(asset.uri, asset.mimeType ?? 'image/jpeg');
      } catch (e: any) {
        const msg = e?.message ?? 'Error desconocido';
        Alert.alert('Error', `No se pudo subir la foto: ${msg}`);
      }
    } finally {
      pickingRef.current = false;
    }
  };

  const showSourcePicker = () => {
    Alert.alert('Agregar foto', 'Elegí el origen', [
      { text: 'Cámara',   onPress: () => pickImage('camera') },
      { text: 'Galería',  onPress: () => pickImage('gallery') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const title = fileType === 'reception' ? 'Fotos de evidencia' : 'Fotos del producto';
  const backLabel = isFromCreate ? 'Omitir' : '←';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() =>
            isFromCreate
              ? router.replace(`/(app)/transactions/${txId}` as never)
              : router.back()
          }
          style={styles.backBtn}
        >
          <Text style={styles.backText}>{backLabel}</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{title}</Text>

        {!isReadOnly && (
          <TouchableOpacity onPress={showSourcePicker} disabled={uploading} style={styles.addBtn}>
            {uploading
              ? <ActivityIndicator color={Colors.primary} size="small" />
              : <Text style={styles.addText}>+ Foto</Text>
            }
          </TouchableOpacity>
        )}
        {isReadOnly && <View style={styles.addBtn} />}
      </View>

      {/* Grid */}
      <ScrollView contentContainerStyle={styles.grid}>
        {isLoading && (
          <View style={styles.empty}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        )}

        {!isLoading && files.length === 0 && !isReadOnly && (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📷</Text>
            <Text style={styles.emptyText}>Sin fotos aún</Text>
            <Text style={styles.emptySub}>
              {fileType === 'reception'
                ? 'Subí fotos como evidencia del estado del artículo recibido.'
                : 'Agregá fotos del producto para que el comprador sepa qué está comprando.'}
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={showSourcePicker} disabled={uploading}>
              <Text style={styles.emptyBtnText}>Agregar primera foto</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isLoading && files.length === 0 && isReadOnly && (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📷</Text>
            <Text style={styles.emptyText}>Sin fotos</Text>
            <Text style={styles.emptySub}>El vendedor no subió fotos del producto.</Text>
          </View>
        )}

        {files.map((f, index) => (
          <TouchableOpacity
            key={f.id}
            style={styles.thumb}
            onPress={() => openViewer(index)}
            activeOpacity={0.85}
          >
            {f.localUri ? (
              <Image source={{ uri: f.localUri }} style={styles.image} resizeMode="cover" />
            ) : (
              <View style={styles.imagePlaceholder}>
                <ActivityIndicator color={Colors.primary} />
              </View>
            )}
            {!isReadOnly && (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDelete(index)}
                disabled={deleting === f.id}
                hitSlop={8}
              >
                {deleting === f.id
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.deleteText}>✖</Text>
                }
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Footer Listo (solo fromCreate) */}
      {isFromCreate && (
        <View style={[styles.footer, { paddingBottom: Math.max(16, insets.bottom + 8) }]}>
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => router.replace(`/(app)/transactions/${txId}` as never)}
          >
            <Text style={styles.doneBtnText}>
              {files.length > 0
                ? `Listo · ${files.length} foto${files.length !== 1 ? 's' : ''}`
                : 'Ir a la transacción'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Visor fullscreen */}
      <PhotoViewer
        uris={uris}
        initialIndex={viewerIndex}
        visible={viewerVisible}
        onClose={() => setViewerVisible(false)}
        canDelete={!isReadOnly}
        onDelete={handleDelete}
      />
    </SafeAreaView>
  );
}

const THUMB = 160;

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: Colors.background },
  header:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface },
  backBtn:          { minWidth: 48 },
  backText:         { fontSize: 22, color: Colors.primary },
  headerTitle:      { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  addBtn:           { minWidth: 56, alignItems: 'flex-end' },
  addText:          { fontSize: 14, fontWeight: '700', color: Colors.primary },
  grid:             { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 12 },
  thumb:            { width: THUMB, height: THUMB, borderRadius: 10, overflow: 'hidden', backgroundColor: Colors.border },
  image:            { width: THUMB, height: THUMB },
  imagePlaceholder: { width: THUMB, height: THUMB, justifyContent: 'center', alignItems: 'center' },
  deleteBtn:        { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  deleteText:       { color: '#fff', fontSize: 11, fontWeight: '700' },
  empty:            { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 8 },
  emptyEmoji:       { fontSize: 48 },
  emptyText:        { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  emptySub:         { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 24 },
  emptyBtn:         { marginTop: 16, backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  emptyBtnText:     { color: '#fff', fontWeight: '700', fontSize: 14 },
  footer:           { padding: 16, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface },
  doneBtn:          { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  doneBtnText:      { color: '#fff', fontSize: 16, fontWeight: '700' },
});
