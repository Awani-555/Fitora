import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen        from '../screens/HomeScreen';
import FitaiScreen       from '../screens/FitaiScreen';
import WardrobeScreen    from '../screens/WardrobeScreen';
import ProfileScreen     from '../screens/ProfileScreen';
import OutfitBoardScreen from '../screens/OutfitBoardScreen';
import { Colors, Fonts } from '../constants/theme';

const Tab = createBottomTabNavigator();

// ─────────────────────────────────────────────────────────────────────────────
// BUG 1 — ROOT CAUSE OF "not working at all"
//
// The original code did:
//   import WardrobeScreen, { openWardrobeUpload } from '../screens/WardrobeScreen'
//   setTimeout(() => { if (openWardrobeUpload) openWardrobeUpload(); }, 150)
//
// This ALWAYS fails because React Navigation uses lazy mounting — the Wardrobe
// tab is NOT mounted until the user first visits it.  So when the + button is
// pressed from Home, WardrobeScreen hasn't run its useEffect yet, meaning the
// exported `openWardrobeUpload` variable is still null.  The 150 ms timeout
// is not enough for a full mount + render cycle, and even if it were, the
// exported ES module binding is a snapshot — it doesn't update reactively.
//
// FIX: a tiny event-emitter object that WardrobeScreen subscribes to.
// WardrobeScreen registers its listener as soon as it mounts, and TabNavigator
// fires the event after navigation.  The 300 ms delay is after the navigation
// animation completes (~250 ms), ensuring the screen is mounted.
// ─────────────────────────────────────────────────────────────────────────────
type PickerMode = 'camera' | 'library';
type Listener   = (mode: PickerMode) => void;

export const wardrobePickerEvent = {
  _listener: null as Listener | null,
  subscribe(fn: Listener)   { this._listener = fn; },
  unsubscribe()              { this._listener = null; },
  fire(mode: PickerMode)    {
    // Wait for navigation animation to finish before opening the system picker
    setTimeout(() => { this._listener?.(mode); }, 300);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// BUG 2 — Permission check BEFORE navigation, not inside WardrobeScreen
//
// When the FAB is tapped the user expects an immediate response (permission
// dialog or picker). Delegating permission to WardrobeScreen causes a two-step
// delay: navigate → wait for mount → request permission → open picker.
// Check permissions here so the flow feels instant.
// ─────────────────────────────────────────────────────────────────────────────
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

const CenterButton = ({ onPress }: { onPress?: () => void }) => {

  const handlePress = () => {
    Alert.alert(
      'Add Clothing Item',
      'How would you like to add it?',
      [
        {
          text: '📷  Camera',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert(
                'Camera Permission Required',
                'Go to Settings → Apps → Expo Go → Permissions → Camera → Allow'
              );
              return;
            }
            onPress?.();                    // switch to Wardrobe tab
            wardrobePickerEvent.fire('camera');
          },
        },
        {
          text: '🖼️  Photo Library',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert(
                'Photos Permission Required',
                'Go to Settings → Apps → Expo Go → Permissions → Photos → Allow'
              );
              return;
            }
            onPress?.();                    // switch to Wardrobe tab
            wardrobePickerEvent.fire('library');
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <TouchableOpacity onPress={handlePress} style={tabStyles.centerBtn} activeOpacity={0.85}>
      <View style={tabStyles.centerBtnInner}>
        <Ionicons name="add" size={28} color="white" />
      </View>
    </TouchableOpacity>
  );
};

type TabIconProps = { name: keyof typeof Ionicons.glyphMap; focused: boolean; label: string };

const TabIcon = ({ name, focused, label }: TabIconProps) => (
  <View style={tabStyles.iconWrap}>
    <Ionicons
      name={focused ? name : `${name}-outline` as any}
      size={22}
      color={focused ? Colors.blue : Colors.textMuted}
    />
    <Text style={[tabStyles.label, focused && tabStyles.labelActive]}>{label}</Text>
  </View>
);

const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarShowLabel: false,
      tabBarStyle: tabStyles.tabBar,
    }}
  >
    <Tab.Screen name="Home"    component={HomeScreen}
      options={{ tabBarIcon: ({ focused }) => <TabIcon name="home"     focused={focused} label="Home"    /> }}
    />
    <Tab.Screen name="FitAI"   component={FitaiScreen}
      options={{ tabBarIcon: ({ focused }) => <TabIcon name="sparkles" focused={focused} label="FitAI"   /> }}
    />
    <Tab.Screen name="Wardrobe" component={WardrobeScreen}
      options={{
        tabBarIcon: () => null,
        tabBarButton: (props) => <CenterButton onPress={props.onPress ?? undefined} />,
      }}
    />
    <Tab.Screen name="Board"   component={OutfitBoardScreen}
      options={{ tabBarIcon: ({ focused }) => <TabIcon name="grid"     focused={focused} label="Board"   /> }}
    />
    <Tab.Screen name="Profile" component={ProfileScreen}
      options={{ tabBarIcon: ({ focused }) => <TabIcon name="person"   focused={focused} label="Profile" /> }}
    />
  </Tab.Navigator>
);

export default TabNavigator;

const tabStyles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.white,
    height: Platform.OS === 'ios' ? 82 : 68,
    borderTopWidth: 0,
    elevation: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
  },
  iconWrap:   { alignItems: 'center', justifyContent: 'center', paddingTop: 4, gap: 3 },
  label:      { fontSize: 10, color: Colors.textMuted, fontWeight: Fonts.medium, letterSpacing: 0.2 },
  labelActive:{ color: Colors.blue },
  centerBtn:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerBtnInner: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.blue,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.blue,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.45, shadowRadius: 12, elevation: 7,
  },
});
