import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, StatusBar, ActivityIndicator, Alert, RefreshControl
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/useAuthStore';
import { colors } from '../../theme/colors';
import { api } from '../../services/api';
import { addWSListener, removeWSListener } from '../../services/websocket';
import ChatFAB from '../../components/ChatFAB';

const logo = require('../../../assets/logo.png');

const ADMIN_ACTIONS = [
  { icon: '👥', label: 'Users', desc: 'Manage & promote', screen: 'AdminUsers' },
  { icon: '🛡️', label: 'Verification', desc: 'Verify student IDs', screen: 'AdminVerification' },
  { icon: '📝', label: 'Quizzes', desc: 'Create quiz & poll', screen: 'AdminQuiz' },
  { icon: '📅', label: 'Events', desc: 'Create & delete', screen: 'AdminEvents' },
];

export default function AdminDashboard({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [polls, setPolls] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    fetchMyCreations();

    const handleRefresh = () => {
      fetchMyCreations();
    };

    addWSListener('REFRESH_EVENTS', handleRefresh);
    addWSListener('REFRESH_QUIZZES', handleRefresh);
    addWSListener('REFRESH_POLLS', handleRefresh);

    return () => {
      removeWSListener('REFRESH_EVENTS', handleRefresh);
      removeWSListener('REFRESH_QUIZZES', handleRefresh);
      removeWSListener('REFRESH_POLLS', handleRefresh);
    };
  }, []);

  const fetchMyCreations = async () => {
    setLoading(true);
    try {
      const [quizRes, pollRes, eventRes] = await Promise.all([
        api.get('/quiz'),
        api.get('/poll'),
        api.get('/events')
      ]);
      
      setQuizzes(quizRes.data.filter((q: any) => q.creator_id === user?.id));
      setPolls(pollRes.data.filter((p: any) => p.creator_id === user?.id));
      setEvents(eventRes.data.filter((e: any) => e.creator_id === user?.id));
    } catch (e) {
      console.log('Error fetching admin creations', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePublishEvent = async (id: string) => {
    try {
      await api.patch(`/events/${id}`, { is_published: true });
      Alert.alert('Success', 'Event published successfully!');
      fetchMyCreations();
    } catch (e) {
      Alert.alert('Error', 'Failed to publish event.');
    }
  };

  const handlePublishQuiz = async (id: string) => {
    try {
      await api.patch(`/quiz/${id}`, { is_published: true });
      Alert.alert('Success', 'Quiz published successfully!');
      fetchMyCreations();
    } catch (e) {
      Alert.alert('Error', 'Failed to publish quiz.');
    }
  };

  const handlePublishPoll = async (id: string) => {
    try {
      await api.patch(`/poll/${id}`, { is_published: true });
      Alert.alert('Success', 'Poll published successfully!');
      fetchMyCreations();
    } catch (e) {
      Alert.alert('Error', 'Failed to publish poll.');
    }
  };

  const handleDeleteEvent = (id: string) => {
    Alert.alert('Delete Event', 'Are you sure you want to delete this event?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/events/${id}`);
            Alert.alert('Success', 'Event deleted successfully.');
            fetchMyCreations();
          } catch (e) {
            Alert.alert('Error', 'Failed to delete event.');
          }
        }
      }
    ]);
  };

  const handleDeleteQuiz = (id: string) => {
    Alert.alert('Delete Quiz', 'Are you sure you want to delete this quiz?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/quiz/${id}`);
            Alert.alert('Success', 'Quiz deleted successfully.');
            fetchMyCreations();
          } catch (e) {
            Alert.alert('Error', 'Failed to delete quiz.');
          }
        }
      }
    ]);
  };

  const handleDeletePoll = (id: string) => {
    Alert.alert('Delete Poll', 'Are you sure you want to delete this poll?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/poll/${id}`);
            Alert.alert('Success', 'Poll deleted successfully.');
            fetchMyCreations();
          } catch (e) {
            Alert.alert('Error', 'Failed to delete poll.');
          }
        }
      }
    ]);
  };

  if (!user || !user.is_admin) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <Text style={{ color: colors.error, fontSize: 16, fontWeight: 'bold' }}>Access Denied</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchMyCreations} tintColor={colors.primary} />}
      >
        {/* Top Bar */}
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 16) }]}>
          <Image source={logo} style={styles.topLogo} resizeMode="contain" />
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>⚡ ADMIN</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Admin Panel</Text>
          <Text style={styles.heroSub}>Welcome back, {user?.full_name?.split(' ')[0] || 'Admin'}</Text>
          <Text style={styles.heroDesc}>Manage users, events, and the Coding Junction community.</Text>
        </View>

        {/* Action Cards */}
        <Text style={styles.sectionLabel}>MANAGEMENT</Text>
        <View style={styles.grid}>
          {ADMIN_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.actionCard}
              onPress={() => navigation.navigate(action.screen as any)}
            >
              <Text style={styles.actionIcon}>{action.icon}</Text>
              <Text style={styles.actionLabel}>{action.label}</Text>
              <Text style={styles.actionDesc}>{action.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Creations Lists */}
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <View style={{ paddingHorizontal: 20, marginTop: 30 }}>
            {/* My Events */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabelInline}>MY EVENTS ({events.length})</Text>
            </View>
            {events.length === 0 ? (
              <Text style={styles.emptyText}>No events created yet.</Text>
            ) : (
              events.map(item => (
                <View key={item.id} style={styles.itemCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemMeta}>
                      🗓 {new Date(item.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </Text>
                    <View style={[styles.statusBadge, item.is_published ? styles.badgeActive : styles.badgeInactive]}>
                      <Text style={styles.statusBadgeText}>{item.is_published ? 'Published' : 'Draft'}</Text>
                    </View>
                  </View>
                  <View style={styles.actionsContainer}>
                    {!item.is_published && (
                      <TouchableOpacity style={styles.actionIconBtn} onPress={() => handlePublishEvent(item.id)}>
                        <MaterialCommunityIcons name="cloud-upload-outline" size={20} color={colors.success} />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.actionIconBtn} onPress={() => navigation.navigate('CreateEvent', { eventId: item.id })}>
                      <MaterialCommunityIcons name="pencil-outline" size={20} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteEvent(item.id)}>
                      <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}

            {/* My Quizzes */}
            <View style={[styles.sectionHeader, { marginTop: 24 }]}>
              <Text style={styles.sectionLabelInline}>MY QUIZZES ({quizzes.length})</Text>
            </View>
            {quizzes.length === 0 ? (
              <Text style={styles.emptyText}>No quizzes created yet.</Text>
            ) : (
              quizzes.map(item => (
                <View key={item.id} style={styles.itemCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{item.title}</Text>
                    <Text style={styles.itemMeta}>{item.questions?.length || 0} Questions</Text>
                    <View style={[styles.statusBadge, item.is_published ? styles.badgeActive : styles.badgeInactive]}>
                      <Text style={styles.statusBadgeText}>{item.is_published ? 'Published' : 'Draft'}</Text>
                    </View>
                  </View>
                  <View style={styles.actionsContainer}>
                    <TouchableOpacity style={styles.actionIconBtn} onPress={() => navigation.navigate('QuizResponses', { quizId: item.id, quizTitle: item.title })}>
                      <MaterialCommunityIcons name="chart-bar" size={20} color="#FF9800" />
                    </TouchableOpacity>
                    {!item.is_published && (
                      <TouchableOpacity style={styles.actionIconBtn} onPress={() => handlePublishQuiz(item.id)}>
                        <MaterialCommunityIcons name="cloud-upload-outline" size={20} color={colors.success} />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.actionIconBtn} onPress={() => navigation.navigate('AdminQuiz', { quizId: item.id })}>
                      <MaterialCommunityIcons name="pencil-outline" size={20} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteQuiz(item.id)}>
                      <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}

            {/* My Polls */}
            <View style={[styles.sectionHeader, { marginTop: 24 }]}>
              <Text style={styles.sectionLabelInline}>MY POLLS ({polls.length})</Text>
            </View>
            {polls.length === 0 ? (
              <Text style={styles.emptyText}>No polls created yet.</Text>
            ) : (
              polls.map(item => (
                <View key={item.id} style={styles.itemCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName} numberOfLines={2}>{item.question}</Text>
                    <Text style={styles.itemMeta}>{item.options?.length || 0} Options</Text>
                    <View style={[styles.statusBadge, item.is_published ? styles.badgeActive : styles.badgeInactive]}>
                      <Text style={styles.statusBadgeText}>{item.is_published ? 'Published' : 'Draft'}</Text>
                    </View>
                  </View>
                  <View style={styles.actionsContainer}>
                    <TouchableOpacity style={styles.actionIconBtn} onPress={() => navigation.navigate('PollDetail', { pollId: item.id })}>
                      <MaterialCommunityIcons name="chart-bar" size={20} color="#FF9800" />
                    </TouchableOpacity>
                    {!item.is_published && (
                      <TouchableOpacity style={styles.actionIconBtn} onPress={() => handlePublishPoll(item.id)}>
                        <MaterialCommunityIcons name="cloud-upload-outline" size={20} color={colors.success} />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.actionIconBtn} onPress={() => navigation.navigate('AdminQuiz', { pollId: item.id })}>
                      <MaterialCommunityIcons name="pencil-outline" size={20} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeletePoll(item.id)}>
                      <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
      <ChatFAB />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderColor: colors.border
  },
  topLogo: { width: 36, height: 36, tintColor: colors.primary },
  adminBadge: {
    backgroundColor: colors.primary + '22', paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1, borderColor: colors.primary + '55',
  },
  adminBadgeText: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  logoutBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: colors.error },
  logoutText: { color: colors.error, fontSize: 13, fontWeight: '600' },
  hero: { paddingHorizontal: 20, paddingVertical: 20 },
  heroTitle: { color: colors.textPrimary, fontSize: 30, fontWeight: 'bold' },
  heroSub: { color: colors.primary, fontSize: 16, marginTop: 4 },
  heroDesc: { color: colors.textSecondary, fontSize: 14, marginTop: 8, lineHeight: 20 },
  sectionLabel: {
    color: colors.textSecondary, fontSize: 11, fontWeight: '700', letterSpacing: 1.5,
    marginHorizontal: 20, marginBottom: 12,
  },
  sectionLabelInline: {
    color: colors.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 1.2
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 12 },
  actionCard: {
    width: '47%', backgroundColor: colors.surface, borderRadius: 16,
    padding: 20, borderWidth: 1, borderColor: colors.border,
  },
  actionIcon: { fontSize: 30, marginBottom: 10 },
  actionLabel: { color: colors.textPrimary, fontWeight: 'bold', fontSize: 16 },
  actionDesc: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  emptyText: { color: colors.textSecondary, fontStyle: 'italic', fontSize: 13, marginBottom: 10 },
  itemCard: {
    backgroundColor: colors.surface, borderRadius: 12, padding: 14, borderWidth: 1,
    borderColor: colors.border, flexDirection: 'row', alignItems: 'center', marginBottom: 10
  },
  itemName: { color: colors.textPrimary, fontSize: 15, fontWeight: 'bold' },
  itemMeta: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  statusBadge: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeActive: { backgroundColor: colors.success + '15' },
  badgeInactive: { backgroundColor: colors.border },
  statusBadgeText: { fontSize: 10, fontWeight: '700', color: colors.textSecondary },
  deleteBtn: { padding: 8, marginLeft: 10 },
  actionsContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionIconBtn: { padding: 8 },
});
