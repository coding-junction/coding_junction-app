import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  Alert, FlatList, RefreshControl
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/useAuthStore';
import { colors } from '../../theme/colors';
import { api } from '../../services/api';
import { addWSListener, removeWSListener } from '../../services/websocket';
import ChatFAB from '../../components/ChatFAB';

export default function CoreDashboard({ navigation }: any) {
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
      
      // Filter only creations belonging to the logged-in Core Member
      setQuizzes(quizRes.data.filter((q: any) => q.creator_id === user?.id));
      setPolls(pollRes.data.filter((p: any) => p.creator_id === user?.id));
      setEvents(eventRes.data.filter((e: any) => e.creator_id === user?.id));
    } catch (e) {
      console.log('Error fetching core member creations', e);
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

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchMyCreations} tintColor={colors.primary} />}
      >
        {/* Top Header */}
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 16) }]}>
          <Text style={styles.dashboardTitle}>Core Member Hub</Text>
          <View style={styles.coreBadge}>
            <Text style={styles.coreBadgeText}>🌟 CORE</Text>
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Welcome back, {user?.full_name?.split(' ')[0]}!</Text>
            <Text style={styles.infoDesc}>Manage your events, quizzes, and polls. Empower the community!</Text>
          </View>
          <MaterialCommunityIcons name="star-face" size={48} color={colors.primary} />
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionLabel}>QUICK CREATION</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('CreateEvent')}
          >
            <MaterialCommunityIcons name="calendar-plus" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>Create Event</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#FF9800' }]}
            onPress={() => navigation.navigate('AdminQuiz')}
          >
            <MaterialCommunityIcons name="brain" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>Quiz / Poll</Text>
          </TouchableOpacity>
        </View>

        {/* Creations Lists */}
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <View style={{ paddingHorizontal: 20 }}>
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
    paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1, borderColor: colors.border
  },
  dashboardTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: 'bold' },
  coreBadge: {
    backgroundColor: '#FF980022', paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1, borderColor: '#FF980055',
  },
  coreBadgeText: { color: '#FF9800', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  infoCard: {
    backgroundColor: colors.surface, borderRadius: 16, borderContent: colors.border,
    borderWidth: 1, padding: 20, margin: 20, flexDirection: 'row', alignItems: 'center'
  },
  infoTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
  infoDesc: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  sectionLabel: {
    color: colors.textSecondary, fontSize: 11, fontWeight: '700', letterSpacing: 1.5,
    marginHorizontal: 20, marginBottom: 12,
  },
  sectionLabelInline: {
    color: colors.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 1.2
  },
  actionRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 24 },
  actionButton: {
    flex: 1, backgroundColor: colors.primary, borderRadius: 12, padding: 16,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8
  },
  actionButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
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
