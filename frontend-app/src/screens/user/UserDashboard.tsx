import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, StatusBar, FlatList, Modal
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../../store/useAuthStore';
import { colors } from '../../theme/colors';
import { api } from '../../services/api';
import ChatFAB from '../../components/ChatFAB';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const logo = require('../../../assets/logo.png');

import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function UserDashboard({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const login = useAuthStore((state) => state.login);
  const token = useAuthStore((state) => state.token);
  const [events, setEvents] = useState<any[]>([]);
  const [showWelcome, setShowWelcome] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (token) {
        api.get('/users/me')
          .then((res) => {
            if (res.data) {
              login(res.data, token);
            }
          })
          .catch((err) => console.log('Dashboard user sync error:', err));
      }
    }, [token])
  );

  useEffect(() => {
    fetchEvents();
    checkWelcome();
    registerPushNotifications();
  }, []);

  const registerPushNotifications = async () => {
    try {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        await api.post(`/users/me/fcm-token?token=${token}`);
        console.log('FCM Token registered:', token);
      }
    } catch (e) {
      console.log('Push notification registration failed', e);
    }
  };

  const registerForPushNotificationsAsync = async () => {
    if (!Device.isDevice) {
      return null;
    }
    
    // Dynamically require to avoid Expo Go SDK 53+ import errors
    const Notifications = require('expo-notifications');
    
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;
    
    try {
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
      
      if (Constants.appOwnership === 'expo' || projectId) {
        if (!projectId) {
          console.log('Project ID not found, trying getDevicePushTokenAsync instead');
          const token = (await Notifications.getDevicePushTokenAsync()).data;
          return token;
        }
        const token = (
          await Notifications.getExpoPushTokenAsync({
            projectId,
          })
        ).data;
        return token;
      } else {
        const token = (await Notifications.getDevicePushTokenAsync()).data;
        return token;
      }
    } catch (error) {
      console.log('Error getting push token, falling back to device token:', error);
      try {
        const token = (await Notifications.getDevicePushTokenAsync()).data;
        return token;
      } catch (deviceError) {
        console.log('Device push token also failed:', deviceError);
        return null;
      }
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await api.get('/events');
      setEvents(res.data);
    } catch (e) {
      console.log('Error fetching dashboard events', e);
    }
  };

  const checkWelcome = async () => {
    const shown = await AsyncStorage.getItem(`welcome_shown_${user?.id}`);
    if (!shown) {
      setShowWelcome(true);
      await AsyncStorage.setItem(`welcome_shown_${user?.id}`, 'true');
    }
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 15) return 'Good Noon';
    if (h < 17) return 'Good Afternoon';
    if (h < 21) return 'Good Evening';
    return 'Good Night';
  };

  const renderEventItem = ({ item }: any) => (
    <TouchableOpacity 
      style={styles.eventCard}
      onPress={() => navigation.navigate('EventsTab')}
    >
      <View style={styles.eventDateBox}>
        <Text style={styles.eventDateDay}>{new Date(item.start_date).getDate()}</Text>
        <Text style={styles.eventDateMonth}>
          {new Date(item.start_date).toLocaleString('default', { month: 'short' })}
        </Text>
      </View>
      <View style={styles.eventInfo}>
        <Text style={styles.eventTitle} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.eventTime} numberOfLines={1}>
          {new Date(item.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Top Bar */}
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 16) }]}>
          <View style={styles.logoRow}>
            <Image source={logo} style={styles.topLogo} resizeMode="contain" />
            <Text style={styles.brandName}>Coding Junction</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <MaterialCommunityIcons name="logout" size={20} color={colors.error} />
          </TouchableOpacity>
        </View>

        {/* Hero Section */}
        <View style={styles.hero}>
          <Text style={styles.greetSmall}>{greeting()},</Text>
          <Text style={styles.greetName}>{user?.full_name?.split(' ')[0] || 'Member'} 👋</Text>
        </View>

        {/* Events Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Latest Events</Text>
          <TouchableOpacity onPress={() => navigation.navigate('EventsTab')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          horizontal
          data={events}
          renderItem={renderEventItem}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.eventList}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No upcoming events</Text>
          }
        />

        {/* Quick Quiz Card */}
        <Text style={styles.sectionTitle}>Daily Challenge</Text>
        <TouchableOpacity 
          style={styles.quizBanner}
          onPress={() => navigation.navigate('QuizTab')}
        >
          <View style={styles.quizInfo}>
            <Text style={styles.quizTitle}>Daily Quiz & Polls</Text>
            <Text style={styles.quizSub}>Test your knowledge and earn points!</Text>
          </View>
          <View style={styles.quizIconBg}>
            <MaterialCommunityIcons name="brain" size={32} color={colors.primary} />
          </View>
        </TouchableOpacity>

        {/* Stats Grid */}
        <Text style={styles.sectionTitle}>Your Performance</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{user?.cgpa || '0.0'}</Text>
            <Text style={styles.statLabel}>Current CGPA</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{user?.year || '1'}</Text>
            <Text style={styles.statLabel}>Academic Year</Text>
          </View>
        </View>

        {/* Verification Status */}
        {!user?.is_identity_verified && !user?.is_admin && !user?.is_core_member && (
          <TouchableOpacity 
            style={styles.verifyBanner}
            onPress={() => navigation.navigate('ProfileTab')}
          >
            <MaterialCommunityIcons name="shield-check-outline" size={24} color="#fff" />
            <Text style={styles.verifyText}>Get Verified & Get Your Badge!</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Welcome Modal */}
      <Modal visible={showWelcome} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.welcomeCard}>
            <Image source={logo} style={styles.modalLogo} resizeMode="contain" />
            <Text style={styles.welcomeTitle}>Welcome to the Club!</Text>
            <Text style={styles.welcomeText}>
              We're excited to have you here at Coding Junction. Start exploring events, quizzes, and chat with our AI mentor!
            </Text>
            <TouchableOpacity 
              style={styles.getStartedBtn}
              onPress={() => setShowWelcome(false)}
            >
              <Text style={styles.getStartedText}>Get Started</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ChatFAB />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topBar: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingBottom: 20 
  },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  topLogo: { width: 32, height: 32, tintColor: colors.primary },
  brandName: { color: colors.textPrimary, fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
  logoutBtn: { 
    width: 40, height: 40, borderRadius: 20, 
    backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border
  },
  hero: { paddingHorizontal: 24, marginBottom: 30 },
  greetSmall: { color: colors.textSecondary, fontSize: 16 },
  greetName: { color: colors.textPrimary, fontSize: 32, fontWeight: 'bold', marginTop: 4 },
  sectionHeader: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    paddingHorizontal: 20, marginBottom: 15 
  },
  sectionTitle: { 
    color: colors.textPrimary, fontSize: 18, fontWeight: 'bold', 
    marginLeft: 20, marginBottom: 15, marginTop: 10 
  },
  seeAll: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  eventList: { paddingLeft: 20, paddingRight: 10 },
  eventCard: {
    backgroundColor: colors.surface,
    width: 260,
    borderRadius: 16,
    padding: 16,
    marginRight: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  eventDateBox: {
    backgroundColor: colors.primary + '22',
    width: 50, height: 50, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.primary + '44'
  },
  eventDateDay: { color: colors.primary, fontSize: 18, fontWeight: 'bold' },
  eventDateMonth: { color: colors.primary, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  eventInfo: { marginLeft: 15, flex: 1 },
  eventTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: 'bold' },
  eventTime: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  emptyText: { color: colors.textSecondary, fontStyle: 'italic', marginLeft: 20 },
  quizBanner: {
    marginHorizontal: 20,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 25
  },
  quizInfo: { flex: 1 },
  quizTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: 'bold' },
  quizSub: { color: colors.textSecondary, fontSize: 13, marginTop: 4 },
  quizIconBg: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center', alignItems: 'center'
  },
  statsGrid: { flexDirection: 'row', paddingHorizontal: 20, gap: 15, marginBottom: 25 },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center'
  },
  statVal: { color: colors.primary, fontSize: 24, fontWeight: 'bold' },
  statLabel: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  verifyBanner: {
    marginHorizontal: 20,
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  verifyText: { color: '#fff', fontSize: 14, fontWeight: 'bold', flex: 1, marginLeft: 12 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center', alignItems: 'center'
  },
  welcomeCard: {
    width: '85%', backgroundColor: colors.surface,
    borderRadius: 24, padding: 30, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border
  },
  modalLogo: { width: 80, height: 80, marginBottom: 20, tintColor: colors.primary },
  welcomeTitle: { color: colors.textPrimary, fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  welcomeText: { color: colors.textSecondary, fontSize: 15, textAlign: 'center', marginTop: 12, lineHeight: 22 },
  getStartedBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14, paddingHorizontal: 40,
    borderRadius: 30, marginTop: 25
  },
  getStartedText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
