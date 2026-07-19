import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, SectionHeader, Chip } from '../components/ui';
import { Colors, Fonts, Radius, Spacing } from '../constants/theme';
import { outfit, wardrobe } from '../services/api';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

const OCCASIONS = [
  { id: 'casual',  icon: '😎', label: 'Casual' },
  { id: 'work',    icon: '💼', label: 'Work' },
  { id: 'date',    icon: '🌹', label: 'Date' },
  { id: 'party',   icon: '🎉', label: 'Party' },
  { id: 'formal',  icon: '🤵', label: 'Formal' },
];

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const getDateStr = () => {
  return new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });
};

const OUTFIT_COLORS = ['#F5EDE0', '#FCEAE8', '#E8F1FF', '#E8F0E8', '#EEEAF8'];
const OUTFIT_EMOJIS = ['👔', '👗', '🧥', '👘', '🥻'];

const HomeScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [activeOccasion, setActiveOccasion] = useState('casual');
  const [outfits, setOutfits]               = useState<any[]>([]);
  const [wardrobeCount, setWardrobeCount]   = useState(0);
  const [generating, setGenerating]         = useState(false);
  const [loading, setLoading]               = useState(true);
  const [refreshing, setRefreshing]         = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [wData, oData] = await Promise.all([
        wardrobe.getAll(),
        outfit.getAll({ occasion: 'casual' })
      ]);
      setWardrobeCount(wData.count || 0);
      setOutfits(oData.outfits?.slice(0, 4) || []);
    } catch { /* show empty state */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadData(); }, []);

  const handleGenerate = async (occ: string) => {
    setActiveOccasion(occ);
    setGenerating(true);
    try {
      const data = await outfit.generate({ occasion: occ });
      setOutfits(data.outfits || []);
    } catch (e: any) {
      // no wardrobe yet - just proceed quietly
    } finally { setGenerating(false); }
  };

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.blue} />}
      >
        {/* Header */}
        <View style={styles.topBar}>
          <View style={styles.userRow}>
            <Avatar initials={firstName[0].toUpperCase()} size={42} />
            <View>
              <Text style={styles.greeting}>{getGreeting()}, {firstName} ✦</Text>
              <Text style={styles.greetingSub}>{getDateStr()}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.notifBtn}>
            <Ionicons name="notifications-outline" size={22} color={Colors.navy} />
          </TouchableOpacity>
        </View>

        {/* Today's Vibe Card */}
        <TouchableOpacity style={styles.todayCard} onPress={() => navigation.navigate('FitAI', { initialPrompt: 'What should I wear today?' })} activeOpacity={0.9}>
          <View style={styles.todayDecor1} />
          <View style={styles.todayDecor2} />
          <Text style={styles.todayLabel}>TODAY'S VIBE</Text>
          <Text style={styles.todayTitle}>Let AI Decide 🎩</Text>
          <Text style={styles.todayDesc}>
            {wardrobeCount > 0
              ? `${wardrobeCount} pieces in your closet — let FitAI build your perfect look for today.`
              : 'Start by adding clothes to your wardrobe, then FitAI will style you every day.'}
          </Text>
          <View style={styles.todayBadge}>
            <View style={styles.todayDot} />
            <Text style={styles.todayBadgeText}>Ask FitAI →</Text>
          </View>
        </TouchableOpacity>

        {/* Occasion Selector */}
        <SectionHeader title="Generate Outfit" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {OCCASIONS.map(o => (
            <Chip key={o.id} label={`${o.icon} ${o.label}`} active={activeOccasion === o.id}
              onPress={() => handleGenerate(o.id)} />
          ))}
        </ScrollView>

        {/* Outfits */}
        <View style={styles.outfitsHeader}>
          <SectionHeader title="Recent Looks" linkText="Wardrobe →" onLinkPress={() => navigation.navigate('Wardrobe')} />
          {generating && <ActivityIndicator color={Colors.blue} style={{ marginRight: Spacing.xl }} />}
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.blue} style={{ marginTop: 20 }} />
        ) : outfits.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>👕</Text>
            <Text style={styles.emptyTitle}>No outfits yet</Text>
            <Text style={styles.emptySub}>Add clothes to your wardrobe and tap an occasion above to generate looks!</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.looksRow}>
            {outfits.map((o, idx) => (
              <View key={o._id || idx} style={styles.lookCard}>
                <View style={[styles.lookImg, { backgroundColor: OUTFIT_COLORS[idx % OUTFIT_COLORS.length] }]}>
                  <Text style={styles.lookEmoji}>{OUTFIT_EMOJIS[idx % OUTFIT_EMOJIS.length]}</Text>
                  <View style={styles.matchBadge}>
                    <Text style={styles.matchText}>{o.matchScore}%</Text>
                  </View>
                </View>
                <View style={styles.lookInfo}>
                  <Text style={styles.lookName} numberOfLines={1}>{o.name}</Text>
                  <Text style={styles.lookTag}>{o.occasion} · {o.items?.length || 0} pieces</Text>
                  <Text style={styles.lookReason} numberOfLines={2}>{o.aiReasoning}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  scroll: { flex: 1 },
  content: { paddingBottom: 100 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  greeting: { fontSize: 15, fontWeight: Fonts.semibold, color: Colors.navy },
  greetingSub: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  notifBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  todayCard: { marginHorizontal: Spacing.xl, marginTop: Spacing.md, backgroundColor: Colors.navy, borderRadius: Radius.xl, padding: Spacing.xxl, overflow: 'hidden', position: 'relative' },
  todayDecor1: { position: 'absolute', top: -24, right: -24, width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(42,137,250,0.2)' },
  todayDecor2: { position: 'absolute', bottom: -16, right: 24, width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(201,168,76,0.18)' },
  todayLabel: { fontSize: 10, letterSpacing: 2, color: 'rgba(255,255,255,0.5)', fontWeight: Fonts.semibold, marginBottom: 8 },
  todayTitle: { fontSize: 22, fontWeight: Fonts.bold, color: Colors.white, marginBottom: 6 },
  todayDesc: { fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 19, marginBottom: Spacing.lg },
  todayBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.blue, alignSelf: 'flex-start', borderRadius: Radius.full, paddingVertical: 6, paddingHorizontal: 14, gap: 6 },
  todayDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.white },
  todayBadgeText: { fontSize: 12, color: Colors.white, fontWeight: Fonts.medium },
  chipRow: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.sm, gap: 10 },
  outfitsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  looksRow: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.sm, gap: 14 },
  lookCard: { width: 160, borderRadius: Radius.lg, backgroundColor: Colors.white, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
  lookImg: { height: 140, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  lookEmoji: { fontSize: 46 },
  matchBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: Colors.blue, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  matchText: { fontSize: 10, color: Colors.white, fontWeight: Fonts.bold },
  lookInfo: { padding: 12 },
  lookName: { fontSize: 13, fontWeight: Fonts.semibold, color: Colors.navy },
  lookTag: { fontSize: 11, color: Colors.textMuted, marginTop: 2, textTransform: 'capitalize' },
  lookReason: { fontSize: 11, color: Colors.textMuted, marginTop: 4, lineHeight: 15 },
  emptyCard: { marginHorizontal: Spacing.xl, backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.xxl, alignItems: 'center' },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: Fonts.semibold, color: Colors.navy, marginBottom: 6 },
  emptySub: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', lineHeight: 18 },
});
