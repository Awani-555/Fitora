import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList,
  KeyboardAvoidingView, Platform, Animated, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Fonts, Radius, Spacing } from '../constants/theme';
import { chat, outfit } from '../services/api';
import { useAuth } from '../context/AuthContext';

// ─────────────────────────────────────────────────────────────────────────────
// FitoraLogoMark — inline so this file has no extra import dependency.
// If your ui.tsx exports this, replace with: import { FitoraLogoMark } from '../components/ui'
// ─────────────────────────────────────────────────────────────────────────────
const FitoraLogoMark = ({ size = 20 }: { size?: number }) => (
  <Text style={{ fontSize: size * 0.9, lineHeight: size * 1.1 }}>✦</Text>
);

type Message = { id: string; role: 'ai' | 'user'; text: string; time: string };

const SUGGESTIONS = [
  { id: '1', label: 'What should I wear today?' },
  { id: '2', label: 'Outfit for a job interview' },
  { id: '3', label: 'How do I match colors?' },
  { id: '4', label: 'Smart casual suggestions' },
];

const getTimeStr = () =>
  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const FitaiScreen = ({ route }: any) => {
  const initialPrompt = route?.params?.initialPrompt;
  const { user } = useAuth();

  const [messages, setMessages]     = useState<Message[]>([{
    id: '0', role: 'ai',
    text: `Hi ${user?.name?.split(' ')[0] || 'there'}! ✨ I'm FitAI, your personal stylist. Ask me anything about outfits, colors, or occasions!`,
    time: getTimeStr(),
  }]);
  const [input,          setInput]   = useState('');
  const [isTyping,    setIsTyping]   = useState(false);
  const [conversationId, setConvId]  = useState<string | undefined>();
  const listRef      = useRef<FlatList>(null);
  const typingOpacity = useRef(new Animated.Value(0)).current;

  // Fire initial prompt if navigated here with one
  useEffect(() => {
    if (initialPrompt) setTimeout(() => sendMessage(initialPrompt), 400);
  }, []);

  // Animate typing dots
  useEffect(() => {
    if (isTyping) {
      Animated.loop(Animated.sequence([
        Animated.timing(typingOpacity, { toValue: 1,   duration: 500, useNativeDriver: true }),
        Animated.timing(typingOpacity, { toValue: 0.3, duration: 500, useNativeDriver: true }),
      ])).start();
    } else {
      typingOpacity.setValue(0);
    }
  }, [isTyping]);

  const sendMessage = async (text?: string) => {
    const val = (text ?? input).trim();
    if (!val || isTyping) return;

    const userMsg: Message = {
      id: Date.now().toString(), role: 'user', text: val, time: getTimeStr(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      // ─────────────────────────────────────────────────────────────────────
      // BUG FIX — api.ts chat.send() now always returns data.reply
      // (the backend returns { reply, conversationId, engine })
      // ─────────────────────────────────────────────────────────────────────
      const data = await chat.send(val, conversationId);
      if (data.conversationId) setConvId(data.conversationId);

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: data.reply || "I'm thinking... try asking again!",
        time: getTimeStr(),
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: "Oops, can't reach the server right now. Make sure the backend is running! 🔌",
        time: getTimeStr(),
      }]);
    } finally {
      setIsTyping(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const analyzeOutfitPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed'); return; }

    // ─────────────────────────────────────────────────────────────────────
    // BUG FIX — MediaTypeOptions.Images is deprecated in Expo SDK 51+
    // and removed in SDK 53+.  Use the string array form instead.
    // ─────────────────────────────────────────────────────────────────────
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as any, // ← correct for Expo SDK 51+
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;

    const userMsg: Message = {
      id: Date.now().toString(), role: 'user',
      text: '📸 Sent an outfit photo for analysis', time: getTimeStr(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      // outfit.analyze uses field "image" in api.ts — matches multer config
      const data    = await outfit.analyze(result.assets[0].uri);
      // ─────────────────────────────────────────────────────────────────
      // BUG FIX — analyzeOutfit controller returns data.analysis
      // ─────────────────────────────────────────────────────────────────
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(), role: 'ai',
        text: data.analysis || data.feedback || 'Looking great! 🌟',
        time: getTimeStr(),
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: 'ai',
        text: "Couldn't analyze the photo right now. Try again!",
        time: getTimeStr(),
      }]);
    } finally {
      setIsTyping(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isAI = item.role === 'ai';
    return (
      <View style={[s.msgRow, isAI ? s.msgRowAI : s.msgRowUser]}>
        {isAI && (
          <View style={s.aiAvatar}>
            <FitoraLogoMark size={16} />
          </View>
        )}
        <View style={[s.bubble, isAI ? s.bubbleAI : s.bubbleUser]}>
          <Text style={[s.bubbleText, isAI ? s.bubbleTextAI : s.bubbleTextUser]}>
            {item.text}
          </Text>
          <Text style={s.timeText}>{item.time}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.safe}>

      {/* Header */}
      <View style={s.header}>
        <View style={s.aiAvatarLg}><FitoraLogoMark size={22} /></View>
        <View style={s.headerInfo}>
          <Text style={s.headerName}>FitAI</Text>
          <View style={s.headerStatus}>
            <View style={s.statusDot} />
            <Text style={s.statusText}>Your personal stylist</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={10}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={m => m.id}
          renderItem={renderMessage}
          contentContainerStyle={s.messageList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListFooterComponent={isTyping ? (
            <View style={s.msgRow}>
              <View style={s.aiAvatar}><FitoraLogoMark size={16} /></View>
              <Animated.View style={[s.bubble, s.bubbleAI, { opacity: typingOpacity }]}>
                <Text style={[s.bubbleText, s.bubbleTextAI]}>  ● ● ●  </Text>
              </Animated.View>
            </View>
          ) : null}
        />

        {/* Quick-start suggestions — only visible on empty chat */}
        {messages.length <= 1 && (
          <View style={s.suggestionsWrap}>
            <Text style={s.suggestLabel}>Try asking...</Text>
            {SUGGESTIONS.map(sg => (
              <TouchableOpacity key={sg.id} style={s.suggestChip} onPress={() => sendMessage(sg.label)}>
                <Text style={s.suggestChipText}>{sg.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Input bar */}
        <View style={s.inputBar}>
          <TouchableOpacity style={s.inputIcon} onPress={analyzeOutfitPhoto}>
            <Ionicons name="camera-outline" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
          <TextInput
            style={s.textInput}
            placeholder="Ask anything..."
            placeholderTextColor={Colors.textLight}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => sendMessage()}
            returnKeyType="send"
            multiline
          />
          <TouchableOpacity
            style={[s.sendBtn, (!input.trim() || isTyping) && { opacity: 0.5 }]}
            onPress={() => sendMessage()}
            disabled={!input.trim() || isTyping}
          >
            <Ionicons name="arrow-up" size={18} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default FitaiScreen;

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: Colors.white },
  flex:          { flex: 1 },
  header:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)', gap: 10, backgroundColor: Colors.white },
  aiAvatarLg:    { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  headerInfo:    { flex: 1 },
  headerName:    { fontSize: 15, fontWeight: Fonts.bold, color: Colors.navy },
  headerStatus:  { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 },
  statusDot:     { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.green },
  statusText:    { fontSize: 11, color: Colors.green, fontWeight: Fonts.medium },
  messageList:   { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, gap: 14 },
  msgRow:        { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginVertical: 4 },
  msgRowAI:      { justifyContent: 'flex-start' },
  msgRowUser:    { justifyContent: 'flex-end' },
  aiAvatar:      { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  bubble:        { maxWidth: '78%', borderRadius: 18, paddingHorizontal: 15, paddingVertical: 10 },
  bubbleAI:      { backgroundColor: '#F2F2F7', borderBottomLeftRadius: 4 },
  bubbleUser:    { backgroundColor: Colors.blue, borderBottomRightRadius: 4 },
  bubbleText:    { fontSize: 14, lineHeight: 21 },
  bubbleTextAI:  { color: Colors.navy },
  bubbleTextUser:{ color: Colors.white },
  timeText:      { fontSize: 10, marginTop: 4, color: Colors.textLight },
  suggestionsWrap: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm, alignItems: 'flex-end', gap: 8 },
  suggestLabel:  { fontSize: 12, color: Colors.textMuted, marginBottom: 4, alignSelf: 'flex-end' },
  suggestChip:   { borderWidth: 1.5, borderColor: Colors.sand, borderRadius: Radius.full, paddingVertical: 8, paddingHorizontal: 18, backgroundColor: Colors.white },
  suggestChipText: { fontSize: 13, color: Colors.navy, fontWeight: Fonts.medium },
  inputBar:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: 10, paddingBottom: Platform.OS === 'ios' ? 14 : 10, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)', gap: 8 },
  inputIcon:     { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F2F2F7', alignItems: 'center', justifyContent: 'center' },
  textInput:     { flex: 1, backgroundColor: '#F2F2F7', borderRadius: 22, paddingHorizontal: Spacing.lg, paddingVertical: 10, fontSize: 14, color: Colors.text, maxHeight: 90 },
  sendBtn:       { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.blue, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.blue, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 3 },
});
