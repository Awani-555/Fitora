/**
 * components/ui.tsx
 * Shared UI components for Fitora.
 * NO external dependencies beyond what's in package.json.
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Colors, Fonts, Radius, Spacing } from '../constants/theme';

// ─── FITORA LOGO ─────────────────────────────────────────────────
// Pure React Native Views — no react-native-svg needed.
export const FitoraLogoMark = ({ size = 36 }: { size?: number }) => {
  const u = size / 36;
  return (
    <View style={{ width: size, height: size }}>
      {/* Top horizontal bar */}
      <View style={{
        position: 'absolute', top: u * 4, left: u * 2,
        width: u * 32, height: u * 6,
        backgroundColor: Colors.blue, borderRadius: u * 3,
      }} />
      {/* Mid horizontal bar */}
      <View style={{
        position: 'absolute', top: u * 15, left: u * 2,
        width: u * 22, height: u * 5,
        backgroundColor: Colors.blue, borderRadius: u * 2.5,
      }} />
      {/* Vertical left stem */}
      <View style={{
        position: 'absolute', top: u * 4, left: u * 2,
        width: u * 6, height: u * 28,
        backgroundColor: Colors.blue, borderRadius: u * 3,
      }} />
    </View>
  );
};

export const FitoraLogo = ({ size = 36 }: { size?: number }) => (
  <View style={styles.logoRow}>
    <FitoraLogoMark size={size} />
    <Text style={[styles.logoText, { fontSize: size * 0.58 }]}>FITORA</Text>
  </View>
);

// ─── AVATAR ──────────────────────────────────────────────────────
export const Avatar = ({
  initials = 'A',
  size = 42,
  style,
}: {
  initials?: string;
  size?: number;
  style?: ViewStyle;
}) => (
  <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }, style]}>
    <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>{initials}</Text>
  </View>
);

// ─── SECTION HEADER ──────────────────────────────────────────────
export const SectionHeader = ({
  title,
  linkText,
  onLinkPress,
}: {
  title: string;
  linkText?: string;
  onLinkPress?: () => void;
}) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {linkText && (
      <TouchableOpacity onPress={onLinkPress}>
        <Text style={styles.sectionLink}>{linkText}</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ─── CHIP ────────────────────────────────────────────────────────
export const Chip = ({
  label,
  active = false,
  onPress,
  icon,
  style,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  icon?: string;
  style?: ViewStyle;
}) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.chip, active && styles.chipActive, style]}
    activeOpacity={0.75}
  >
    <Text style={[styles.chipText, active && styles.chipTextActive]}>
      {icon ? `${icon} ` : ''}{label}
    </Text>
  </TouchableOpacity>
);

// ─── TAG BADGE ───────────────────────────────────────────────────
export const Tag = ({
  label,
  color = Colors.blue,
  bg = Colors.blueSoft,
}: {
  label: string;
  color?: string;
  bg?: string;
}) => (
  <View style={[styles.tag, { backgroundColor: bg }]}>
    <Text style={[styles.tagText, { color }]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoText: { color: Colors.blue, fontWeight: Fonts.bold, letterSpacing: 2.5 },
  avatar: {
    backgroundColor: Colors.blue, alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.blue, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  avatarText: { color: Colors.white, fontWeight: Fonts.bold },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.sm,
  },
  sectionTitle: { fontSize: 18, fontWeight: Fonts.semibold, color: Colors.navy, letterSpacing: 0.2 },
  sectionLink: { fontSize: 13, color: Colors.blue, fontWeight: Fonts.medium },
  chip: {
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: Radius.full, borderWidth: 1.5,
    borderColor: Colors.sand, backgroundColor: Colors.white,
  },
  chipActive: { backgroundColor: Colors.blue, borderColor: Colors.blue },
  chipText: { fontSize: 13, color: Colors.navy, fontWeight: Fonts.medium },
  chipTextActive: { color: Colors.white },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tagText: { fontSize: 11, fontWeight: Fonts.semibold },
});
