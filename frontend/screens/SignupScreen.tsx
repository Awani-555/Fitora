import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
  Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { FitoraLogoMark } from '../components/ui';
import { Colors, Fonts, Radius, Spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

const SignupScreen = ({ navigation }: any) => {
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const { register } = useAuth();

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Missing info', 'Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await register(name.trim(), email.trim().toLowerCase(), password);
    } catch (err: any) {
      Alert.alert('Sign up failed', err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={Colors.navy} />
          </TouchableOpacity>

          <View style={styles.logoSection}>
            <View style={styles.logoIconWrap}>
              <FitoraLogoMark size={40} />
            </View>
            <Text style={styles.brand}>FITORA</Text>
          </View>

          <Text style={styles.heading}>Create account</Text>
          <Text style={styles.sub}>Your AI wardrobe awaits</Text>

          <View style={styles.form}>
            <View style={styles.inputRow}>
              <Ionicons name="person-outline" size={18} color={Colors.textMuted} />
              <TextInput style={styles.input} placeholder="Full name" placeholderTextColor={Colors.textLight} value={name} onChangeText={setName} editable={!loading} />
            </View>
            <View style={styles.inputRow}>
              <Ionicons name="mail-outline" size={18} color={Colors.textMuted} />
              <TextInput style={styles.input} placeholder="Email address" placeholderTextColor={Colors.textLight} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" editable={!loading} />
            </View>
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} />
              <TextInput style={styles.input} placeholder="Password (min 6 chars)" placeholderTextColor={Colors.textLight} value={password} onChangeText={setPassword} secureTextEntry={!showPwd} editable={!loading} />
              <TouchableOpacity onPress={() => setShowPwd(!showPwd)}>
                <Ionicons name={showPwd ? 'eye-outline' : 'eye-off-outline'} size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.createBtn, loading && { opacity: 0.7 }]} onPress={handleSignup} disabled={loading} activeOpacity={0.85}>
              {loading
                ? <ActivityIndicator color={Colors.white} />
                : <Text style={styles.createBtnText}>Create Account</Text>
              }
            </TouchableOpacity>
          </View>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SignupScreen;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: 40 },
  back: { marginBottom: Spacing.lg, width: 40 },
  logoSection: { alignItems: 'center', marginBottom: Spacing.lg },
  logoIconWrap: { width: 70, height: 70, borderRadius: 20, backgroundColor: Colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  brand: { fontSize: 20, fontWeight: Fonts.bold, color: Colors.blue, letterSpacing: 4, marginTop: 8 },
  heading: { fontSize: 26, fontWeight: Fonts.bold, color: Colors.navy, marginBottom: 4 },
  sub: { fontSize: 14, color: Colors.textMuted, marginBottom: Spacing.xxl },
  form: { gap: 10 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F2F7', borderRadius: Radius.full, paddingHorizontal: Spacing.lg, paddingVertical: 11, borderWidth: 1, borderColor: '#E5E5EA', gap: 10 },
  input: { flex: 1, fontSize: 15, color: Colors.text },
  createBtn: { backgroundColor: Colors.blue, borderRadius: Radius.full, paddingVertical: 15, alignItems: 'center', marginTop: 8, height: 52, justifyContent: 'center', shadowColor: Colors.blue, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 4 },
  createBtnText: { color: Colors.white, fontSize: 16, fontWeight: Fonts.bold, letterSpacing: 0.5 },
  loginRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: Spacing.xxl },
  loginText: { fontSize: 14, color: Colors.textMuted },
  loginLink: { fontSize: 14, color: Colors.blue, fontWeight: Fonts.semibold },
});
