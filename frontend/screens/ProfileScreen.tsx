import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, FitoraLogo } from '../components/ui';
import { Colors, Fonts, Radius, Spacing } from '../constants/theme';
import { wardrobe, outfit, shopping } from '../services/api';
import { useAuth } from '../context/AuthContext';

const ProfileScreen = ({ navigation }: any) => {
  const { user, logout } = useAuth();
  const [stats, setStats]           = useState({ pieces: 0, outfits: 0, score: 0 });
  const [shopData, setShopData]     = useState<any>(null);
  const [loading, setLoading]       = useState(true);
  const [shopLoading, setShopLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [wData, oData] = await Promise.all([wardrobe.getAll(), outfit.getAll()]);
        setStats({ pieces: wData.count || 0, outfits: oData.count || 0, score: Math.min(98, (wData.count || 0) * 3 + 10) });
      } catch { /* keep defaults */ }
      finally { setLoading(false); }
    };

    const loadShopping = async () => {
      try {
        const data = await shopping.getSuggestions();
        setShopData(data);
      } catch { /* keep null */ }
      finally { setShopLoading(false); }
    };

    loadStats();
    loadShopping();
  }, []);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await logout(); } }
    ]);
  };

  const openLink = (url: string) => Linking.openURL(url);

  const firstName = user?.name?.split(' ')[0] || 'there';
  const initials  = user?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'F';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Top */}
        <View style={styles.topBar}>
          <FitoraLogo size={28} />
          <TouchableOpacity style={styles.settingsBtn}>
            <Ionicons name="settings-outline" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <Avatar initials={initials} size={80} />
          <Text style={styles.name}>{user?.name || 'Fitora User'}</Text>
          <Text style={styles.bio}>{user?.email}</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsCard}>
          <Text style={styles.statsHeader}>YOUR JOURNEY</Text>
          {loading ? <ActivityIndicator color={Colors.blue} style={{ padding: 20 }} /> : (
            <View style={styles.statsRow}>
              {[
                { num: String(stats.pieces), label: 'Pieces', color: Colors.blue },
                { num: String(stats.outfits), label: 'Outfits', color: Colors.gold },
                { num: `${Math.min(99, stats.score)}%`, label: 'Complete', color: Colors.green },
              ].map(s => (
                <View key={s.label} style={styles.statItem}>
                  <Text style={[styles.statNum, { color: s.color }]}>{s.num}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Shopping Section */}
        {!shopLoading && shopData && shopData.gaps?.length > 0 && (
          <View style={styles.shopCard}>
            <Text style={styles.shopTitle}>🛍️ Complete Your Wardrobe</Text>
            <Text style={styles.shopScore}>
              Wardrobe score: {shopData.wardrobeScore}% — {shopData.wardrobeHealth}
            </Text>
            {shopData.recommendations?.slice(0, 3).map((rec: any, i: number) => (
              <View key={i} style={styles.shopItem}>
                <View style={styles.shopItemInfo}>
                  <Text style={styles.shopItemIcon}>{rec.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.shopItemName}>{rec.name}</Text>
                    <Text style={styles.shopItemPrice}>{rec.priceRange || rec.price}</Text>
                  </View>
                </View>
                <View style={styles.shopLinks}>
                  {[['M', rec.links?.myntra], ['A', rec.links?.amazon], ['F', rec.links?.flipkart]].map(([label, url]) => url ? (
                    <TouchableOpacity key={label} style={styles.shopLinkBtn} onPress={() => openLink(url as string)}>
                      <Text style={styles.shopLinkText}>{label}</Text>
                    </TouchableOpacity>
                  ) : null)}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Nav rows */}
        <View style={styles.section}>
          {[
            { icon: '👗', label: 'My Wardrobe', sub: `${stats.pieces} pieces`, onPress: () => navigation.navigate('Wardrobe') },
            { icon: '✨', label: 'FitAI Chat', sub: 'Your personal stylist', onPress: () => navigation.navigate('FitAI') },
          ].map((row, i) => (
            <TouchableOpacity key={row.label} style={[styles.row, i === 0 && styles.rowBorder]} onPress={row.onPress} activeOpacity={0.7}>
              <Text style={styles.rowIcon}>{row.icon}</Text>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>{row.label}</Text>
                <Text style={styles.rowSub}>{row.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <TouchableOpacity style={[styles.row, styles.rowBorder]} activeOpacity={0.7}>
            <Text style={styles.rowIcon}>🔔</Text>
            <View style={styles.rowText}><Text style={styles.rowLabel}>Notifications</Text></View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={handleLogout} activeOpacity={0.7}>
            <Text style={styles.rowIcon}>🚪</Text>
            <View style={styles.rowText}><Text style={[styles.rowLabel, { color: Colors.red }]}>Sign Out</Text></View>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>FITORA v2.0  ·  Free Stack  ·  90% ML Accuracy</Text>
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  content: { paddingBottom: 100 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing.sm },
  settingsBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center' },
  hero: { alignItems: 'center', paddingVertical: Spacing.xl },
  name: { fontSize: 24, fontWeight: Fonts.bold, color: Colors.navy, marginTop: 14, marginBottom: 4 },
  bio: { fontSize: 13, color: Colors.textMuted },
  statsCard: { marginHorizontal: Spacing.xl, marginBottom: Spacing.lg, backgroundColor: Colors.white, borderRadius: Radius.xl, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  statsHeader: { padding: Spacing.lg, paddingBottom: 0, fontSize: 10, letterSpacing: 1.5, color: Colors.textMuted, fontWeight: Fonts.semibold },
  statsRow: { flexDirection: 'row', padding: Spacing.lg },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: Fonts.bold },
  statLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 3 },
  // Shopping card
  shopCard: { marginHorizontal: Spacing.xl, marginBottom: Spacing.lg, backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  shopTitle: { fontSize: 15, fontWeight: Fonts.semibold, color: Colors.navy, marginBottom: 4 },
  shopScore: { fontSize: 12, color: Colors.textMuted, marginBottom: Spacing.md },
  shopItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.warm },
  shopItemInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  shopItemIcon: { fontSize: 20 },
  shopItemName: { fontSize: 13, fontWeight: Fonts.medium, color: Colors.navy },
  shopItemPrice: { fontSize: 11, color: Colors.textMuted },
  shopLinks: { flexDirection: 'row', gap: 6 },
  shopLinkBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: Colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  shopLinkText: { fontSize: 10, fontWeight: Fonts.bold, color: Colors.blue },
  // Rows
  section: { marginHorizontal: Spacing.xl, marginBottom: Spacing.lg, backgroundColor: Colors.white, borderRadius: Radius.xl, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: 15, gap: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.warm },
  rowIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 14, color: Colors.text, fontWeight: Fonts.medium },
  rowSub: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  version: { textAlign: 'center', fontSize: 11, color: Colors.textLight, letterSpacing: 1, marginBottom: 8 },
});
