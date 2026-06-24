import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { api } from '../../services/api';
import ChatFAB from '../../components/ChatFAB';
import { addWSListener, removeWSListener } from '../../services/websocket';

export default function QuizListScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [polls, setPolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();

    const handleRefresh = () => {
      fetchData();
    };

    addWSListener('REFRESH_QUIZZES', handleRefresh);
    addWSListener('REFRESH_POLLS', handleRefresh);

    return () => {
      removeWSListener('REFRESH_QUIZZES', handleRefresh);
      removeWSListener('REFRESH_POLLS', handleRefresh);
    };
  }, []);

  const fetchData = async () => {
    try {
      const [quizRes, pollRes] = await Promise.all([
        api.get('/quiz'),
        api.get('/poll')
      ]);
      setQuizzes(quizRes.data);
      setPolls(pollRes.data);
    } catch (e) {
      console.log('Error fetching quizzes/polls', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const renderQuizItem = ({ item }: any) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => navigation.navigate('QuizDetail', { quizId: item.id })}
    >
      <View style={[styles.iconBox, { backgroundColor: colors.primary + '15' }]}>
        <MaterialCommunityIcons name="brain" size={24} color={colors.primary} />
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardSub}>{item.questions?.length || 0} Questions</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  const renderPollItem = ({ item }: any) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => navigation.navigate('PollDetail', { pollId: item.id })}
    >
      <View style={[styles.iconBox, { backgroundColor: '#FF980015' }]}>
        <MaterialCommunityIcons name="poll" size={24} color="#FF9800" />
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle}>{item.question}</Text>
        <Text style={styles.cardSub}>{item.options?.length || 0} Options</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Quizzes & Polls</Text>
        <Text style={styles.subtitle}>Test your knowledge and give feedback</Text>
      </View>

      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.sectionTitle}>Daily Quizzes</Text>
        <FlatList
          data={quizzes}
          renderItem={renderQuizItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          ListEmptyComponent={<Text style={styles.emptyText}>No quizzes available today.</Text>}
        />

        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Live Polls</Text>
        <FlatList
          data={polls}
          renderItem={renderPollItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          ListEmptyComponent={<Text style={styles.emptyText}>No active polls.</Text>}
        />
        
        <View style={{ height: 100 }} />
      </ScrollView>

      <ChatFAB />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: { padding: 20, paddingBottom: 10 },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: 'bold' },
  subtitle: { color: colors.textSecondary, fontSize: 14, marginTop: 4 },
  sectionTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: 'bold', marginHorizontal: 20, marginVertical: 15 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    marginHorizontal: 20, marginBottom: 12, padding: 15, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border
  },
  iconBox: { width: 48, height: 48, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1, marginLeft: 15 },
  cardTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: 'bold' },
  cardSub: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  emptyText: { color: colors.textSecondary, marginHorizontal: 20, fontStyle: 'italic' }
});
