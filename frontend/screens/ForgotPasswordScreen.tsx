import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FitoraLogoMark } from '../components/ui';
import { Colors, Fonts, Radius, Spacing } from '../constants/theme';

const ForgotPasswordScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    if (!email.trim()) { Alert.alert('Required', 'Please enter your email'); return; }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Alert.alert('Email sent ✓', 'Check your inbox for a reset link.', [{ text: 'Back to Login', onPress: () => navigation.goBack() }]);
    }, 1200);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={Colors.navy} />
          </TouchableOpacity>
          <View style={{ alignItems: 'center', marginBottom: Spacing.xl }}>
            <View style={styles.logoWrap}><FitoraLogoMark size={40} /></View>
          </View>
          <Text style={styles.heading}>Forgot password?</Text>
          <Text style={styles.sub}>Enter your email and we'll send you a reset link.</Text>
          <View style={[styles.inputRow, { marginTop: Spacing.xxl }]}>
            <Ionicons name="mail-outline" size={18} color={Colors.textMuted} />
            <TextInput style={styles.input} placeholder="Email address" placeholderTextColor={Colors.textLight} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          </View>
          <TouchableOpacity style={[styles.btn, loading && { opacity: 0.7 }]} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.btnText}>Send Reset Link</Text>}
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.lg }}>
            <Text style={{ color: Colors.textMuted }}>Remember it? </Text>
            <TouchableOpacity onPress={() => navigation.goBack()}><Text style={{ color: Colors.blue, fontWeight: Fonts.semibold }}>Sign In</Text></TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ForgotPasswordScreen;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  scroll: { flexGrow: 1, paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: 40 },
  back: { marginBottom: Spacing.xl, width: 40 },
  logoWrap: { width: 70, height: 70, borderRadius: 20, backgroundColor: Colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  heading: { fontSize: 26, fontWeight: Fonts.bold, color: Colors.navy, marginBottom: 8 },
  sub: { fontSize: 14, color: Colors.textMuted, lineHeight: 20 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F2F7', borderRadius: Radius.full, paddingHorizontal: Spacing.lg, paddingVertical: 11, borderWidth: 1, borderColor: '#E5E5EA', gap: 10, marginBottom: 10 },
  input: { flex: 1, fontSize: 15, color: Colors.text },
  btn: { backgroundColor: Colors.blue, borderRadius: Radius.full, height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xxl, shadowColor: Colors.blue, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 4 },
  btnText: { color: Colors.white, fontSize: 16, fontWeight: Fonts.bold },
});
