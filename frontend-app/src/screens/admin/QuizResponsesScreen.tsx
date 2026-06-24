import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  RefreshControl, LayoutAnimation, Platform, UIManager
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { api } from '../../services/api';
import { addWSListener, removeWSListener } from '../../services/websocket';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function QuizResponsesScreen({ route, navigation }: any) {
  const { quizId, quizTitle } = route.params;

  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState<any[]>([]);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  useEffect(() => {
    fetchResponses();

    const handleNewSubmission = (data: any) => {
      if (data.quiz_id === quizId) {
        // Quietly update responses without full screen loading spinner
        api.get(`/quiz/${quizId}/responses`)
          .then(res => setResponses(res.data))
          .catch(e => console.log('WS quiet update failed:', e));
      }
    };

    addWSListener('REFRESH_QUIZ_RESPONSES', handleNewSubmission);

    return () => {
      removeWSListener('REFRESH_QUIZ_RESPONSES', handleNewSubmission);
    };
  }, [quizId]);

  const fetchResponses = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/quiz/${quizId}/responses`);
      setResponses(res.data);
    } catch (e) {
      console.log('Error fetching quiz responses:', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (userId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (expandedUser === userId) {
      setExpandedUser(null);
    } else {
      setExpandedUser(userId);
    }
  };

  // Group responses by user
  const groupedResponses = responses.reduce((acc: any, curr: any) => {
    const userId = curr.user_id;
    if (!acc[userId]) {
      acc[userId] = {
        userId,
        userName: curr.user.full_name,
        roleTag: curr.user.role_tag,
        submittedAt: curr.submitted_at,
        questions: [],
        correctCount: 0
      };
    }
    acc[userId].questions.push({
      questionText: curr.question.text,
      optionText: curr.option.text,
      isCorrect: curr.option.is_correct
    });
    if (curr.option.is_correct) {
      acc[userId].correctCount += 1;
    }
    return acc;
  }, {});

  const respondentList = Object.values(groupedResponses);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>Quiz Responses</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{quizTitle}</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : respondentList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="clipboard-text-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyText}>No responses received yet.</Text>
        </View>
      ) : (
        <FlatList
          data={respondentList}
          keyExtractor={(item: any) => item.userId}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={fetchResponses} tintColor={colors.primary} />
          }
          renderItem={({ item }: any) => {
            const isExpanded = expandedUser === item.userId;
            const scoreText = `${item.correctCount} / ${item.questions.length}`;

            return (
              <View style={styles.card}>
                <TouchableOpacity style={styles.cardHeader} onPress={() => toggleExpand(item.userId)}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.nameRow}>
                      <Text style={styles.userName}>{item.userName}</Text>
                      <View style={[
                        styles.badge, 
                        item.roleTag.includes('Admin') || item.roleTag.includes('Core') ? styles.badgeCore : styles.badgeStudent
                      ]}>
                        <Text style={styles.badgeText}>{item.roleTag}</Text>
                      </View>
                    </View>
                    <Text style={styles.timeText}>
                      Submitted on: {new Date(item.submittedAt).toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                    <Text style={styles.scoreText}>{scoreText}</Text>
                    <MaterialCommunityIcons 
                      name={isExpanded ? "chevron-up" : "chevron-down"} 
                      size={20} 
                      color={colors.textSecondary} 
                      style={{ marginTop: 4 }}
                    />
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.expandedContent}>
                    <View style={styles.divider} />
                    {item.questions.map((q: any, index: number) => (
                      <View key={index} style={styles.questionItem}>
                        <Text style={styles.qText}>Q{index + 1}: {q.questionText}</Text>
                        <View style={styles.answerRow}>
                          <MaterialCommunityIcons 
                            name={q.isCorrect ? "check-circle" : "close-circle"} 
                            size={18} 
                            color={q.isCorrect ? colors.success : colors.error} 
                          />
                          <Text style={[
                            styles.chosenText, 
                            { color: q.isCorrect ? colors.success : colors.error }
                          ]}>
                            {q.optionText} {q.isCorrect ? '(Correct)' : '(Incorrect)'}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 15, borderBottomWidth: 1, borderColor: colors.border
  },
  backBtn: { padding: 4 },
  headerTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: 'bold' },
  headerSub: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { color: colors.textSecondary, fontSize: 15, marginTop: 12, fontStyle: 'italic' },
  list: { padding: 16 },
  card: {
    backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1,
    borderColor: colors.border, marginBottom: 12, overflow: 'hidden'
  },
  cardHeader: { flexDirection: 'row', padding: 16 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  userName: { color: colors.textPrimary, fontSize: 15, fontWeight: 'bold' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  badgeCore: { backgroundColor: '#FF980022', borderWidth: 1, borderColor: '#FF980055' },
  badgeStudent: { backgroundColor: colors.primary + '15', borderWidth: 1, borderColor: colors.primary + '35' },
  badgeText: { fontSize: 9, fontWeight: '800', color: colors.textPrimary },
  timeText: { color: colors.textSecondary, fontSize: 11, marginTop: 6 },
  scoreText: { color: colors.primary, fontSize: 15, fontWeight: 'bold' },
  expandedContent: { paddingHorizontal: 16, paddingBottom: 16 },
  divider: { height: 1, backgroundColor: colors.border, marginBottom: 12 },
  questionItem: { marginBottom: 12 },
  qText: { color: colors.textPrimary, fontSize: 13, fontWeight: '600', marginBottom: 4 },
  answerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  chosenText: { fontSize: 12, fontWeight: '500' }
});
