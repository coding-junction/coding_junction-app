import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity,
  RefreshControl, Alert, Image
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { colors } from '../../theme/colors';
import { useAuthStore } from '../../store/useAuthStore';

const logo = require('../../../assets/logo.png');

export default function AdminEventsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await api.get('/events/');
      setEvents(response.data);
    } catch {
      Alert.alert('Error', 'Could not load events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEvents(); }, []);

  const confirmDelete = (id: string) => {
    Alert.alert('Delete Event', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/events/${id}`);
          fetchEvents();
        } catch {
          Alert.alert('Error', 'Failed to delete.');
        }
      }}
    ]);
  };

  const renderItem = ({ item }: any) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.eventName}>{item.name}</Text>
        <Text style={styles.eventDate}>
          🗓 {new Date(item.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </Text>
        {item.description ? <Text style={styles.eventDesc} numberOfLines={2}>{item.description}</Text> : null}
        <View style={[styles.badge, item.is_active ? styles.activeBadge : styles.inactiveBadge]}>
          <Text style={styles.badgeText}>{item.is_active ? 'Active' : 'Inactive'}</Text>
        </View>
      </View>
      {(user?.is_admin || item.creator_id === user?.id) && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('CreateEvent', { eventId: item.id })}>
            <Text style={styles.editIcon}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDelete(item.id)}>
            <Text style={styles.deleteIcon}>🗑</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Events</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('CreateEvent')}>
          <Text style={styles.addText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : events.length === 0 ? (
        <View style={styles.centered}>
          <Image source={logo} style={styles.emptyLogo} resizeMode="contain" />
          <Text style={styles.emptyText}>No events yet</Text>
          <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('CreateEvent')}>
            <Text style={styles.createBtnText}>Create First Event</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={i => i.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchEvents} tintColor={colors.primary} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 16,
    borderBottomWidth: 1, borderColor: colors.border,
  },
  backBtn: { padding: 8 },
  backIcon: { color: colors.primary, fontSize: 22 },
  headerTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: 'bold' },
  addBtn: { backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  addText: { color: '#0E0A12', fontWeight: 'bold', fontSize: 14 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  emptyLogo: { width: 80, height: 80, opacity: 0.3, tintColor: colors.primary },
  emptyText: { color: colors.textSecondary, fontSize: 16 },
  createBtn: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
  createBtnText: { color: '#0E0A12', fontWeight: 'bold' },
  card: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'flex-start',
    borderWidth: 1, borderColor: colors.border,
  },
  eventName: { color: colors.textPrimary, fontWeight: 'bold', fontSize: 16 },
  eventDate: { color: colors.primary, fontSize: 13, marginTop: 4 },
  eventDesc: { color: colors.textSecondary, fontSize: 13, marginTop: 6, lineHeight: 18 },
  badge: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  activeBadge: { backgroundColor: colors.success + '22' },
  inactiveBadge: { backgroundColor: colors.error + '22' },
  badgeText: { fontSize: 11, fontWeight: '700', color: colors.success },
  deleteBtn: { padding: 8, marginLeft: 8 },
  deleteIcon: { fontSize: 20 },
  editBtn: { padding: 8 },
  editIcon: { fontSize: 20 },
});
