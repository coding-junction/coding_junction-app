import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { colors } from '../../theme/colors';
import { addWSListener, removeWSListener } from '../../services/websocket';
import ChatFAB from '../../components/ChatFAB';

export default function EventsListScreen() {
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await api.get('/events');
      setEvents(response.data);
    } catch (error) {
      console.log('Error fetching events', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();

    const handleRefresh = () => {
      fetchEvents();
    };

    addWSListener('REFRESH_EVENTS', handleRefresh);

    return () => {
      removeWSListener('REFRESH_EVENTS', handleRefresh);
    };
  }, []);

  const renderItem = ({ item }: any) => (
    <View style={styles.card}>
      <Text style={styles.title}>{item.name}</Text>
      <Text style={styles.date}>{new Date(item.start_date).toLocaleDateString()}</Text>
      <Text style={styles.description}>{item.description}</Text>
      {item.registration_link && (
        <TouchableOpacity 
          style={styles.registerButton}
          onPress={() => Alert.alert('External Link', `Open ${item.registration_link}?`)}
        >
          <Text style={styles.registerButtonText}>Register Now</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <Text style={styles.headerTitle}>Upcoming Events</Text>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={fetchEvents} tintColor={colors.primary} />
          }
          ListEmptyComponent={<Text style={styles.emptyText}>No events available right now.</Text>}
        />
      )}
      <ChatFAB />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  headerTitle: {
    fontSize: 24,
    color: colors.primary,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  card: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  date: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 16,
  },
  registerButton: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  registerButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 32,
  },
});
