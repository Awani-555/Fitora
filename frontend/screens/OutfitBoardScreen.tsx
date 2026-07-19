/**
 * OutfitBoardScreen.tsx
 * Visual outfit collage — Pinterest-style layout with real wardrobe images
 * Mimics the exact layout in the reference photo:
 *   [top-left: bag] [center: tee+jeans] [top-right: accessories]
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Dimensions, ActivityIndicator, Image, FlatList,
  Animated, Alert, RefreshControl, Share, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Radius, Spacing } from '../constants/theme';
import { wardrobe, outfit } from '../services/api';

const { width, height } = Dimensions.get('window');

// ─── LAYOUT CONFIG ────────────────────────────────────────────────────────────
// Mirrors the Pinterest collage style: big center + surrounding accessories
const BOARD_W = width - Spacing.xl * 2;
const CARD_SM = (BOARD_W - 12) / 3;
const CARD_MD = (BOARD_W - 12) / 2;
const CARD_LG = (BOARD_W - 12) * 0.55;

const TYPE_BG: Record<string, string> = {
  top:       '#F5EDE0',
  bottom:    '#EBF3FF',
  dress:     '#FCEAE8',
  outerwear: '#E8F0E8',
  footwear:  '#F0EBF8',
  accessory: '#FEF3E2',
  other:     '#F5F0E8',
};

const TYPE_EMOJI: Record<string, string> = {
  top: '👕', bottom: '👖', dress: '👗', outerwear: '🧥',
  footwear: '👟', accessory: '⌚', other: '👔'
};

const OCCASIONS = [
  { id: 'casual', label: 'Casual', icon: '☀️' },
  { id: 'work',   label: 'Work',   icon: '💼' },
  { id: 'date',   label: 'Date',   icon: '🌹' },
  { id: 'party',  label: 'Party',  icon: '✨' },
  { id: 'formal', label: 'Formal', icon: '🤵' },
];

// ─── ITEM CARD ─────────────────────────────────────────────────────────────────
const ItemCard = ({
  item, width: w, height: h, selected, onPress, showLabel = true
}: {
  item: any; width: number; height: number;
  selected?: boolean; onPress?: () => void; showLabel?: boolean;
}) => (
  <TouchableOpacity
    style={[styles.card, { width: w, height: h }, selected && styles.cardSelected]}
    onPress={onPress}
    activeOpacity={0.85}
  >
    {item.imageUrl ? (
      <Image source={{ uri: item.imageUrl }} style={styles.cardImg} resizeMode="cover" />
    ) : (
      <View style={[styles.cardPlaceholder, { backgroundColor: TYPE_BG[item.type] || '#F5F0E8' }]}>
        <Text style={{ fontSize: h * 0.35 }}>{TYPE_EMOJI[item.type] || '👔'}</Text>
      </View>
    )}
    {selected && (
      <View style={styles.cardCheckmark}>
        <Ionicons name="checkmark-circle" size={20} color={Colors.blue} />
      </View>
    )}
    {showLabel && (
      <View style={styles.cardLabel}>
        <Text style={styles.cardLabelText} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cardLabelSub} numberOfLines={1}>{item.color?.primary}</Text>
      </View>
    )}
  </TouchableOpacity>
);

// ─── COLLAGE BOARD ─────────────────────────────────────────────────────────────
// Pinterest-style layout that mimics the reference outfit photo layout
const CollageBoard = ({ items, reasoning, matchScore }: {
  items: any[]; reasoning: string; matchScore: number;
}) => {
  const byType: Record<string, any> = {};
  items.forEach(i => { if (!byType[i.type]) byType[i.type] = i; });

  const top       = byType.top;
  const bottom    = byType.bottom;
  const dress     = byType.dress;
  const footwear  = byType.footwear;
  const bag       = byType.accessory;
  const outerwear = byType.outerwear;

  const mainPiece = dress || top;
  const hasMain   = !!mainPiece;

  return (
    <View style={styles.board}>
      {/* Score badge */}
      <View style={styles.scoreBadge}>
        <Text style={styles.scoreText}>✦ {matchScore}% match</Text>
      </View>

      {/* ── ROW 1: accessories row (top of board) ── */}
      <View style={styles.boardRow}>
        {/* Bag / outerwear — left */}
        {(bag || outerwear) ? (
          <View style={[styles.boardItem, { width: CARD_MD - 4, height: CARD_MD - 4, backgroundColor: TYPE_BG[(bag || outerwear).type] || '#F5EDE0', borderRadius: Radius.lg }]}>
            {(bag || outerwear).imageUrl
              ? <Image source={{ uri: (bag || outerwear).imageUrl }} style={styles.boardImg} resizeMode="contain" />
              : <Text style={{ fontSize: 50 }}>{TYPE_EMOJI[(bag || outerwear).type]}</Text>
            }
            <Text style={styles.boardItemLabel}>{(bag || outerwear).type}</Text>
          </View>
        ) : <View style={{ width: CARD_MD - 4, height: CARD_MD - 4, backgroundColor: 'transparent' }} />}

        {/* Footwear — right */}
        {footwear ? (
          <View style={[styles.boardItem, { width: CARD_MD - 4, height: CARD_MD - 4, backgroundColor: TYPE_BG.footwear, borderRadius: Radius.lg }]}>
            {footwear.imageUrl
              ? <Image source={{ uri: footwear.imageUrl }} style={styles.boardImg} resizeMode="contain" />
              : <Text style={{ fontSize: 50 }}>👟</Text>
            }
            <Text style={styles.boardItemLabel}>footwear</Text>
          </View>
        ) : <View style={{ width: CARD_MD - 4 }} />}
      </View>

      {/* ── ROW 2: main outfit (tall center piece) ── */}
      <View style={[styles.boardRow, { marginTop: 8 }]}>
        {hasMain ? (
          <View style={[styles.boardMainPiece, { backgroundColor: TYPE_BG[mainPiece.type] || '#F5EDE0' }]}>
            {mainPiece.imageUrl
              ? <Image source={{ uri: mainPiece.imageUrl }} style={styles.boardImg} resizeMode="contain" />
              : <Text style={{ fontSize: 80 }}>{TYPE_EMOJI[mainPiece.type]}</Text>
            }
            {bottom && !dress && (
              // Stack jeans below tee inside the same card
              <View style={styles.bottomOverlay}>
                {bottom.imageUrl
                  ? <Image source={{ uri: bottom.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                  : <Text style={{ fontSize: 60 }}>👖</Text>
                }
              </View>
            )}
            <Text style={styles.boardItemLabel}>{dress ? 'dress' : `${mainPiece.type} + ${bottom ? 'bottom' : ''}`}</Text>
          </View>
        ) : (
          <View style={styles.boardMainPiece}>
            <Text style={{ fontSize: 60, opacity: 0.2 }}>👗</Text>
            <Text style={{ color: Colors.textMuted, fontSize: 13, marginTop: 8 }}>Add top or dress</Text>
          </View>
        )}
      </View>

      {/* ── Outfit reasoning ── */}
      <View style={styles.reasoningBox}>
        <Text style={styles.reasoningText}>✨ {reasoning}</Text>
      </View>
    </View>
  );
};

// ─── MAIN SCREEN ───────────────────────────────────────────────────────────────
const OutfitBoardScreen = ({ navigation }: any) => {
  const [allItems, setAllItems]         = useState<any[]>([]);
  const [outfits, setOutfits]           = useState<any[]>([]);
  const [activeOutfit, setActiveOutfit] = useState<any>(null);
  const [activeOccasion, setOccasion]  = useState('casual');
  const [loading, setLoading]           = useState(true);
  const [generating, setGenerating]     = useState(false);
  const [refreshing, setRefreshing]     = useState(false);
  const [showPicker, setShowPicker]     = useState(false);
  const [selectedIds, setSelectedIds]   = useState<Set<string>>(new Set());
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const animateIn = () => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  };

  const loadData = useCallback(async () => {
    try {
      const [wData, oData] = await Promise.all([
        wardrobe.getAll(),
        outfit.getAll()
      ]);
      setAllItems(wData.items || []);
      const loadedOutfits = oData.outfits || [];
      setOutfits(loadedOutfits);
      if (loadedOutfits.length > 0 && !activeOutfit) {
        setActiveOutfit(loadedOutfits[0]);
        animateIn();
      }
    } catch { /* empty wardrobe */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadData(); }, []);

  const generateOutfit = async (occ: string) => {
    setOccasion(occ);
    setGenerating(true);
    try {
      const data = await outfit.generate({ occasion: occ, mood: 'comfortable' });
      const newOutfits = data.outfits || [];
      if (newOutfits.length > 0) {
        setOutfits(prev => [...newOutfits, ...prev]);
        setActiveOutfit(newOutfits[0]);
        animateIn();
      }
    } catch (e: any) {
      Alert.alert('Could not generate', allItems.length === 0
        ? 'Add clothes to your wardrobe first! Go to the Wardrobe tab and tap + to upload.'
        : e.message || 'Try again'
      );
    } finally { setGenerating(false); }
  };

  // Build populated items from outfit
  const getOutfitItems = (o: any) => {
    if (!o) return [];
    // Items may be populated objects or refs — handle both
    return (o.items || []).map((i: any) => i.itemId || i).filter(Boolean);
  };

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const shareOutfit = async () => {
    try {
      await Share.share({ message: `Check out this outfit I built with Fitora AI! 🎩` });
    } catch { /* */ }
  };

  // ─── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.blue} />}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Outfit Board</Text>
            <Text style={styles.sub}>Visual style collage</Text>
          </View>
          <TouchableOpacity style={styles.shareBtn} onPress={shareOutfit}>
            <Ionicons name="share-outline" size={20} color={Colors.navy} />
          </TouchableOpacity>
        </View>

        {/* ── Occasion pills ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
          {OCCASIONS.map(o => (
            <TouchableOpacity
              key={o.id}
              style={[styles.pill, activeOccasion === o.id && styles.pillActive]}
              onPress={() => generateOutfit(o.id)}
            >
              <Text style={styles.pillIcon}>{o.icon}</Text>
              <Text style={[styles.pillText, activeOccasion === o.id && styles.pillTextActive]}>{o.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Generate button ── */}
        <TouchableOpacity
          style={[styles.generateBtn, generating && { opacity: 0.7 }]}
          onPress={() => generateOutfit(activeOccasion)}
          disabled={generating}
          activeOpacity={0.85}
        >
          {generating
            ? <><ActivityIndicator color={Colors.white} size="small" /><Text style={styles.generateBtnText}> Building outfit...</Text></>
            : <><Ionicons name="sparkles" size={16} color={Colors.white} /><Text style={styles.generateBtnText}> Generate New Look</Text></>
          }
        </TouchableOpacity>

        {/* ── Main Board ── */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={Colors.blue} />
            <Text style={styles.loadingText}>Loading your wardrobe...</Text>
          </View>
        ) : !activeOutfit ? (
          <View style={styles.emptyBoard}>
            <Text style={styles.emptyEmoji}>🎨</Text>
            <Text style={styles.emptyTitle}>No outfits yet</Text>
            <Text style={styles.emptySub}>
              Upload clothes to your wardrobe first,{'\n'}then tap "Generate New Look" above!
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('Wardrobe')}>
              <Text style={styles.emptyBtnText}>+ Go to Wardrobe</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Animated.View style={{ opacity: fadeAnim }}>
            <CollageBoard
              items={getOutfitItems(activeOutfit)}
              reasoning={activeOutfit.aiReasoning || activeOutfit.reasoning || 'A curated look for you ✨'}
              matchScore={activeOutfit.matchScore || 88}
            />
          </Animated.View>
        )}

        {/* ── Outfit strip — swipe between looks ── */}
        {outfits.length > 1 && (
          <>
            <Text style={styles.sectionTitle}>Your Looks</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.outfitStrip}>
              {outfits.map((o, idx) => {
                const items = getOutfitItems(o);
                const isActive = activeOutfit?._id === o._id;
                return (
                  <TouchableOpacity
                    key={o._id || idx}
                    style={[styles.stripCard, isActive && styles.stripCardActive]}
                    onPress={() => { setActiveOutfit(o); animateIn(); }}
                    activeOpacity={0.85}
                  >
                    <View style={styles.stripPreview}>
                      {items.slice(0, 4).map((item: any, i: number) => (
                        <View
                          key={i}
                          style={[
                            styles.stripThumb,
                            { backgroundColor: TYPE_BG[item?.type] || '#F5F0E8' }
                          ]}
                        >
                          {item?.imageUrl
                            ? <Image source={{ uri: item.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                            : <Text style={{ fontSize: 14 }}>{TYPE_EMOJI[item?.type] || '👔'}</Text>
                          }
                        </View>
                      ))}
                    </View>
                    <Text style={styles.stripName} numberOfLines={1}>{o.name}</Text>
                    <Text style={styles.stripScore}>{o.matchScore}%</Text>
                    {isActive && <View style={styles.stripActiveDot} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        )}

        {/* ── Individual items section ── */}
        {allItems.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>All Wardrobe Pieces  ({allItems.length})</Text>
            <FlatList
              data={allItems}
              keyExtractor={i => i._id}
              numColumns={3}
              scrollEnabled={false}
              contentContainerStyle={styles.itemGrid}
              columnWrapperStyle={styles.itemGridRow}
              renderItem={({ item }) => (
                <View style={styles.gridItem}>
                  <View style={[styles.gridThumb, { backgroundColor: TYPE_BG[item.type] || '#F5F0E8' }]}>
                    {item.imageUrl
                      ? <Image source={{ uri: item.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      : <Text style={{ fontSize: 28 }}>{TYPE_EMOJI[item.type] || '👔'}</Text>
                    }
                  </View>
                  <Text style={styles.gridName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.gridType}>{item.type} · {item.color?.primary}</Text>
                </View>
              )}
            />
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default OutfitBoardScreen;

// ─── STYLES ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  scroll: { paddingBottom: 20 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing.sm },
  title: { fontSize: 26, fontWeight: Fonts.bold, color: Colors.navy },
  sub: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  shareBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2 },

  pillRow: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.sm, gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.sand, backgroundColor: Colors.white },
  pillActive: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  pillIcon: { fontSize: 13 },
  pillText: { fontSize: 13, fontWeight: Fonts.medium, color: Colors.navy },
  pillTextActive: { color: Colors.white },

  generateBtn: { marginHorizontal: Spacing.xl, marginBottom: Spacing.lg, backgroundColor: Colors.blue, borderRadius: Radius.full, height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: Colors.blue, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 4 },
  generateBtnText: { color: Colors.white, fontSize: 15, fontWeight: Fonts.semibold },

  // ── Board ──
  board: { marginHorizontal: Spacing.xl, backgroundColor: Colors.white, borderRadius: 24, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 4 },
  scoreBadge: { position: 'absolute', top: 16, right: 16, backgroundColor: Colors.navy, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 5, zIndex: 10 },
  scoreText: { color: Colors.white, fontSize: 11, fontWeight: Fonts.bold, letterSpacing: 0.5 },

  boardRow: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  boardItem: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  boardImg: { width: '90%', height: '75%' },
  boardItemLabel: { fontSize: 10, color: Colors.textMuted, textTransform: 'capitalize', marginTop: 4, letterSpacing: 0.5 },

  boardMainPiece: {
    width: BOARD_W - 32,
    height: 280,
    borderRadius: Radius.xl,
    backgroundColor: '#FAF8F4',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: '50%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  reasoningBox: { marginTop: 14, backgroundColor: Colors.blueSoft, borderRadius: Radius.md, padding: 12 },
  reasoningText: { fontSize: 12, color: Colors.navy, lineHeight: 17 },

  // ── Loading / Empty ──
  loadingWrap: { alignItems: 'center', paddingVertical: 60 },
  loadingText: { color: Colors.textMuted, marginTop: 12 },
  emptyBoard: { margin: Spacing.xl, backgroundColor: Colors.white, borderRadius: 24, padding: 40, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: Fonts.semibold, color: Colors.navy, marginBottom: 8 },
  emptySub: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyBtn: { backgroundColor: Colors.blue, borderRadius: Radius.full, paddingHorizontal: 28, paddingVertical: 12 },
  emptyBtnText: { color: Colors.white, fontSize: 14, fontWeight: Fonts.semibold },

  // ── Outfit strip ──
  sectionTitle: { fontSize: 17, fontWeight: Fonts.semibold, color: Colors.navy, paddingHorizontal: Spacing.xl, marginTop: Spacing.xl, marginBottom: Spacing.sm },
  outfitStrip: { paddingHorizontal: Spacing.xl, gap: 12, paddingBottom: 4 },
  stripCard: { width: 110, borderRadius: Radius.lg, backgroundColor: Colors.white, padding: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 1, position: 'relative' },
  stripCardActive: { borderWidth: 2, borderColor: Colors.blue },
  stripPreview: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 },
  stripThumb: { width: 42, height: 42, borderRadius: 8, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  stripName: { fontSize: 11, fontWeight: Fonts.semibold, color: Colors.navy },
  stripScore: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  stripActiveDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.blue },

  // ── Item grid ──
  itemGrid: { paddingHorizontal: Spacing.xl, paddingBottom: 8 },
  itemGridRow: { gap: 10, marginBottom: 10 },
  gridItem: { flex: 1, maxWidth: (width - Spacing.xl * 2 - 20) / 3, alignItems: 'center' },
  gridThumb: { width: '100%', aspectRatio: 1, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 6 },
  gridName: { fontSize: 11, fontWeight: Fonts.medium, color: Colors.navy, textAlign: 'center' },
  gridType: { fontSize: 10, color: Colors.textMuted, textAlign: 'center', textTransform: 'capitalize' },

  // ── Item picker card ──
  card: { borderRadius: Radius.md, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  cardSelected: { borderColor: Colors.blue },
  cardImg: { width: '100%', height: '75%' },
  cardPlaceholder: { width: '100%', height: '75%', alignItems: 'center', justifyContent: 'center' },
  cardCheckmark: { position: 'absolute', top: 6, right: 6, backgroundColor: Colors.white, borderRadius: 10 },
  cardLabel: { padding: 6 },
  cardLabelText: { fontSize: 11, fontWeight: Fonts.semibold, color: Colors.navy },
  cardLabelSub: { fontSize: 10, color: Colors.textMuted, textTransform: 'capitalize' },
});
