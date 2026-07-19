import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, FlatList,
  Dimensions, Alert, ActivityIndicator, Image, Modal,
  TextInput, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { Tag } from '../components/ui';
import { Colors, Fonts, Radius, Spacing } from '../constants/theme';
import { wardrobe } from '../services/api';

// ─────────────────────────────────────────────────────────────────────────────
// BUG 1 FIX — import the event emitter instead of exporting a mutable ref
//
// The old code exported `openWardrobeUpload` as a mutable let binding.
// This has two fatal problems:
//   a) ES module exports are live bindings for READS but assignment from outside
//      doesn't update the binding that TabNavigator holds. The ref stays null.
//   b) Bottom tabs are lazy — WardrobeScreen may not be mounted yet when
//      TabNavigator tries to call the function.
//
// The event emitter in TabNavigator fires AFTER navigation completes (300 ms),
// by which time WardrobeScreen is guaranteed to be mounted and subscribed.
// ─────────────────────────────────────────────────────────────────────────────
import { wardrobePickerEvent } from '../navigation/TabNavigator';

const { width } = Dimensions.get('window');
const CARD_W    = (width - Spacing.xl * 2 - Spacing.md) / 2;

const CATEGORIES = ['All', 'Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Shoes', 'Accessories'];

const TYPE_COLORS: Record<string, string> = {
  top: '#F5EDE0', bottom: '#E8F1FF', dress: '#FCEAE8',
  outerwear: '#E8F0E8', footwear: '#F0EBF8', accessory: '#FEF3E2', other: '#F5F0E8',
};
const TYPE_EMOJIS: Record<string, string> = {
  top: '👕', bottom: '👖', dress: '👗', outerwear: '🧥',
  footwear: '👟', accessory: '⌚', other: '👔',
};

// ─────────────────────────────────────────────────────────────────────────────
// BUG 2 — REMOVED: `export let openWardrobeUpload: (() => void) | null = null`
//
// This global ref is the root cause of the "not working at all" symptom.
// See TabNavigator.tsx for the full explanation.
// ─────────────────────────────────────────────────────────────────────────────

const WardrobeScreen = ({ navigation }: any) => {
  const [items,           setItems]      = useState<any[]>([]);
  const [loading,         setLoading]    = useState(true);
  const [refreshing,      setRefreshing] = useState(false);
  const [uploading,       setUploading]  = useState(false);
  const [activeCategory,  setCategory]   = useState('All');
  const [showModal,       setShowModal]  = useState(false);
  const [pickedImage,     setPickedImage]= useState<string | null>(null);
  const [itemName,        setItemName]   = useState('');
  const [stats,           setStats]      = useState({ total: 0, byType: {} as any });

  // ── Subscribe to FAB event from TabNavigator ───────────────────────────────
  useEffect(() => {
    wardrobePickerEvent.subscribe((mode) => {
      if (mode === 'camera')  pickFromCamera();
      else                    pickFromGallery();
    });
    // Cleanup so re-mounting doesn't stack duplicate listeners
    return () => wardrobePickerEvent.unsubscribe();
  }, []); // intentionally empty — functions are stable

  // ── Load wardrobe on first mount and every time tab is focused ─────────────
  const loadWardrobe = useCallback(async () => {
    try {
      const data = await wardrobe.getAll();
      setItems(data.items || []);
      setStats({ total: data.count || 0, byType: data.stats?.byType || {} });
    } catch { /* empty wardrobe is fine */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { loadWardrobe(); }, []));

  const filteredItems = activeCategory === 'All'
    ? items
    : items.filter(i => i.category === activeCategory);

  // ── Image picking ──────────────────────────────────────────────────────────

  const pickFromGallery = async () => {
    // BUG 3 FIX — MediaTypeOptions.Images is DEPRECATED in Expo SDK 51+ and
    // throws a warning / silently fails on SDK 53+.  Use the string array form.
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as any,   // ← correct for Expo SDK 51+
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPickedImage(result.assets[0].uri);
      setShowModal(true);
    }
  };

  const pickFromCamera = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPickedImage(result.assets[0].uri);
      setShowModal(true);
    }
  };

  const showAddOptions = () =>
    Alert.alert(
      '➕ Add Clothing Item',
      'How would you like to add it?',
      [
        { text: '📷  Camera',        onPress: pickFromCamera  },
        { text: '🖼️  Photo Library',  onPress: pickFromGallery },
        { text: 'Cancel',            style: 'cancel'          },
      ]
    );

  // ── Upload ─────────────────────────────────────────────────────────────────

  const handleUpload = async () => {
    if (!pickedImage || uploading) return;
    setUploading(true);
    try {
      // BUG 4 FIX — api.ts wardrobe.upload() first arg is imageUri, second is
      // a meta object with optional fields.  The original call passed an object
      // as first arg which caused "uri is undefined" in the FormData builder.
      const result = await wardrobe.upload(pickedImage, {
        name: itemName.trim() || undefined,
      });

      closeModal();
      const cls = result.classification;
      Alert.alert(
        '✅ Added to Wardrobe!',
        [
          `Type: ${cls?.detectedType || 'auto-detected'}`,
          `Color: ${cls?.detectedColor || 'detected'}`,
          cls?.confidence ? `ML confidence: ${Math.round(cls.confidence * 100)}%` : null,
        ].filter(Boolean).join('\n')
      );
      loadWardrobe();
    } catch (err: any) {
      const isNetwork = !!(
        err.message?.includes('Network') ||
        err.message?.includes('fetch')   ||
        err.message?.includes('Failed to fetch')
      );
      Alert.alert(
        'Upload Failed',
        isNetwork
          // BUG 5 FIX — give actionable network error with the correct URLs
          ? [
              'Cannot reach the server. Check:',
              '',
              '• Backend running?  →  cd backend && npm run dev',
              '• Android emulator? →  set API_BASE = http://10.0.2.2:5000/api',
              '• Physical device?  →  set API_BASE = http://YOUR_PC_IP:5000/api',
              '  (Windows: run ipconfig  |  Mac: run ifconfig)',
            ].join('\n')
          : (err.message || 'Something went wrong. Try again.')
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (id: string, name: string) =>
    Alert.alert('Remove item?', `Remove "${name}" from wardrobe?`, [
      { text: 'Cancel',  style: 'cancel' },
      { text: 'Remove',  style: 'destructive', onPress: async () => {
          try { await wardrobe.delete(id); loadWardrobe(); } catch { }
      }},
    ]);

  const closeModal = () => { setShowModal(false); setPickedImage(null); setItemName(''); };
  const onRefresh  = () => { setRefreshing(true); loadWardrobe(); };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe}>

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>My Wardrobe</Text>
          <Text style={s.sub}>{stats.total} pieces catalogued</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={showAddOptions}>
          <Ionicons name="add" size={20} color={Colors.white} />
          <Text style={s.addBtnText}>Add Item</Text>
        </TouchableOpacity>
      </View>

      {/* Stats strip */}
      {stats.total > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.statsRow}>
          {Object.entries(stats.byType).map(([type, count]) => (
            <View key={type} style={s.statChip}>
              <Text style={s.statEmoji}>{TYPE_EMOJIS[type] || '👔'}</Text>
              <Text style={s.statCount}>{count as number}</Text>
              <Text style={s.statType}>{type}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Category filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabRow}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[s.tab, activeCategory === cat && s.tabActive]}
            onPress={() => setCategory(cat)}
          >
            <Text style={[s.tabText, activeCategory === cat && s.tabTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Item grid */}
      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={Colors.blue} />
          <Text style={s.loadingText}>Loading wardrobe...</Text>
        </View>
      ) : filteredItems.length === 0 ? (
        <View style={s.emptyState}>
          <Text style={{ fontSize: 64, marginBottom: 16 }}>👗</Text>
          <Text style={s.emptyTitle}>
            {items.length === 0 ? 'Your wardrobe is empty' : `No ${activeCategory} yet`}
          </Text>
          <Text style={s.emptySub}>
            {items.length === 0
              ? 'Tap "Add Item" above or the\n+ button in the tab bar below!'
              : 'Add more items or switch category'}
          </Text>
          <TouchableOpacity style={s.emptyBtn} onPress={showAddOptions}>
            <Text style={s.emptyBtnText}>+ Add Clothing Item</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={i => i._id}
          numColumns={2}
          contentContainerStyle={s.grid}
          columnWrapperStyle={s.gridRow}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.blue} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={s.itemCard}
              activeOpacity={0.85}
              onLongPress={() => handleDelete(item._id, item.name)}
            >
              <View style={[s.itemImg, { backgroundColor: TYPE_COLORS[item.type] || '#F5F0E8' }]}>
                {item.imageUrl
                  ? <Image source={{ uri: item.imageUrl }} style={s.fullImg} resizeMode="cover" />
                  : <Text style={s.itemEmoji}>{TYPE_EMOJIS[item.type] || '👔'}</Text>
                }
              </View>
              <View style={s.itemInfo}>
                <Text style={s.itemName} numberOfLines={1}>{item.name}</Text>
                <Text style={s.itemMeta}>{item.category} · {item.color?.primary || '–'}</Text>
                <View style={s.tagRow}>
                  {item.style?.slice(0, 2).map((t: string) => <Tag key={t} label={t} />)}
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* In-screen FAB (backup shortcut) */}
      <TouchableOpacity style={s.fab} onPress={showAddOptions}>
        <Ionicons name="add" size={26} color={Colors.white} />
      </TouchableOpacity>

      {/* Upload Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={closeModal} style={s.modalCloseBtn}>
              <Ionicons name="close" size={24} color={Colors.navy} />
            </TouchableOpacity>
            <Text style={s.modalTitle}>Add to Wardrobe</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            {pickedImage && (
              <Image source={{ uri: pickedImage }} style={s.previewImg} resizeMode="cover" />
            )}

            <View style={s.mlBadge}>
              <Ionicons name="sparkles" size={14} color={Colors.blue} />
              <Text style={s.mlBadgeText}>
                ML model auto-detects type, category &amp; color when running
              </Text>
            </View>

            <Text style={s.fieldLabel}>
              Item name{' '}
              <Text style={{ color: Colors.textMuted, fontWeight: '400' }}>(optional)</Text>
            </Text>
            <View style={s.textInputRow}>
              <Ionicons name="pricetag-outline" size={16} color={Colors.textMuted} />
              <TextInput
                style={s.nameInput}
                placeholder="e.g. White T-Shirt, Dark Jeans..."
                placeholderTextColor={Colors.textLight}
                value={itemName}
                onChangeText={setItemName}
                autoCapitalize="words"
              />
            </View>

            <Text style={s.tipText}>
              💡 Lay items flat on a white surface for best ML classification results
            </Text>

            <TouchableOpacity
              style={[s.uploadBtn, uploading && { opacity: 0.65 }]}
              onPress={handleUpload}
              disabled={uploading}
            >
              {uploading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <ActivityIndicator color={Colors.white} size="small" />
                  <Text style={s.uploadBtnText}>Classifying with ML...</Text>
                </View>
              ) : (
                <Text style={s.uploadBtnText}>✅  Add to Wardrobe</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={s.repickBtn}
              onPress={() => { closeModal(); setTimeout(showAddOptions, 350); }}
            >
              <Text style={s.repickText}>↩  Choose a different photo</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

export default WardrobeScreen;

const s = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: Colors.cream },
  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing.sm },
  title:     { fontSize: 26, fontWeight: Fonts.bold, color: Colors.navy },
  sub:       { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  addBtn:    { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.blue, paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.full, shadowColor: Colors.blue, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  addBtnText:{ color: Colors.white, fontWeight: Fonts.semibold, fontSize: 14 },

  statsRow:  { paddingHorizontal: Spacing.xl, paddingBottom: 8, gap: 8 },
  statChip:  { alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  statEmoji: { fontSize: 18, marginBottom: 2 },
  statCount: { fontSize: 16, fontWeight: Fonts.bold, color: Colors.navy },
  statType:  { fontSize: 10, color: Colors.textMuted, textTransform: 'capitalize' },

  tabRow:       { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.sm, gap: 8 },
  tab:          { paddingHorizontal: 16, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.sand, backgroundColor: Colors.white },
  tabActive:    { backgroundColor: Colors.navy, borderColor: Colors.navy },
  tabText:      { fontSize: 13, color: Colors.navy, fontWeight: Fonts.medium },
  tabTextActive:{ color: Colors.white },

  centered:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: Colors.textMuted },

  emptyState:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyTitle:  { fontSize: 18, fontWeight: Fonts.semibold, color: Colors.navy, textAlign: 'center', marginBottom: 10 },
  emptySub:    { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  emptyBtn:    { backgroundColor: Colors.blue, borderRadius: Radius.full, paddingHorizontal: 28, paddingVertical: 13, shadowColor: Colors.blue, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 4 },
  emptyBtnText:{ color: Colors.white, fontWeight: Fonts.semibold, fontSize: 15 },

  grid:        { paddingHorizontal: Spacing.xl, paddingBottom: 120 },
  gridRow:     { gap: Spacing.md, marginBottom: Spacing.md },
  itemCard:    { width: CARD_W, borderRadius: Radius.lg, backgroundColor: Colors.white, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2 },
  itemImg:     { height: 130, alignItems: 'center', justifyContent: 'center' },
  fullImg:     { width: '100%', height: '100%' },
  itemEmoji:   { fontSize: 44 },
  itemInfo:    { padding: 10 },
  itemName:    { fontSize: 13, fontWeight: Fonts.semibold, color: Colors.navy },
  itemMeta:    { fontSize: 11, color: Colors.textMuted, marginTop: 2, textTransform: 'capitalize' },
  tagRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },

  fab:         { position: 'absolute', bottom: 90, right: Spacing.xl, width: 54, height: 54, borderRadius: 27, backgroundColor: Colors.blue, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.blue, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.45, shadowRadius: 10, elevation: 6 },

  modal:       { flex: 1, backgroundColor: Colors.white },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.sand },
  modalCloseBtn:{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  modalTitle:  { fontSize: 17, fontWeight: Fonts.semibold, color: Colors.navy },

  previewImg:  { width: '100%', height: 300, backgroundColor: Colors.warm },
  mlBadge:     { flexDirection: 'row', alignItems: 'flex-start', gap: 8, margin: Spacing.xl, marginBottom: Spacing.md, backgroundColor: Colors.blueSoft, padding: 12, borderRadius: Radius.md },
  mlBadgeText: { fontSize: 13, color: Colors.navy, flex: 1, lineHeight: 18 },

  fieldLabel:  { paddingHorizontal: Spacing.xl, fontSize: 13, fontWeight: Fonts.semibold, color: Colors.navy, marginBottom: 8 },
  textInputRow:{ flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: Colors.sand, borderRadius: Radius.md, paddingHorizontal: Spacing.lg, marginHorizontal: Spacing.xl },
  nameInput:   { flex: 1, paddingVertical: 13, fontSize: 15, color: Colors.text },
  tipText:     { marginHorizontal: Spacing.xl, marginTop: 12, fontSize: 12, color: Colors.textMuted, lineHeight: 18 },

  uploadBtn:    { marginHorizontal: Spacing.xl, marginTop: 24, backgroundColor: Colors.blue, borderRadius: Radius.full, height: 54, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.blue, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 5 },
  uploadBtnText:{ color: Colors.white, fontSize: 16, fontWeight: Fonts.bold },
  repickBtn:   { alignItems: 'center', marginTop: 16, paddingVertical: 8 },
  repickText:  { color: Colors.textMuted, fontSize: 14 },
});
