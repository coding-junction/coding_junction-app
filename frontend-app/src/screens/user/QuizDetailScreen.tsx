import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';

export default function QuizDetailScreen({ route, navigation }: any) {
  const { quizId } = route.params;
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);

  const [quiz, setQuiz] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Review mode state
  const [reviewMode, setReviewMode] = useState(false);
  const [myResponses, setMyResponses] = useState<Record<string, string>>({}); // question_id → option_id chosen

  useEffect(() => {
    fetchQuizAndData();
  }, []);

  const fetchQuizAndData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/quiz');
      const found = res.data.find((q: any) => q.id === quizId);
      setQuiz(found);

      // Check if user already submitted
      try {
        const respRes = await api.get(`/quiz/${quizId}/my-response`);
        if (respRes.data && respRes.data.length > 0) {
          const map: Record<string, string> = {};
          respRes.data.forEach((r: any) => {
            map[r.question_id] = r.option_id;
          });
          setMyResponses(map);
          setReviewMode(true);
        }
      } catch (e) {
        // Not submitted yet — show quiz normally
        setReviewMode(false);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to load quiz');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (questionId: string, optionId: string) => {
    setSelectedOptions({ ...selectedOptions, [questionId]: optionId });
  };

  const handleSubmit = async () => {
    if (!quiz) return;
    if (Object.keys(selectedOptions).length < quiz.questions.length) {
      Alert.alert('Incomplete', 'Please answer all questions before submitting.');
      return;
    }
    try {
      const payload = Object.entries(selectedOptions).map(([qId, oId]) => ({
        question_id: qId,
        option_id: oId,
      }));
      await api.post(`/quiz/${quizId}/submit`, payload);
      Alert.alert('Submitted!', 'Your answers have been saved. See how you did!');
      // Enter review mode with submitted answers
      setMyResponses(selectedOptions);
      setReviewMode(true);
      setCurrentQuestionIndex(0);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Submission failed');
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  if (!quiz) return <View style={styles.center}><Text style={styles.error}>Quiz not found</Text></View>;

  // Creator blocked
  if (quiz.creator_id === user?.id) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="close" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>{quiz.title}</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.center}>
          <MaterialCommunityIcons name="shield-account-outline" size={60} color={colors.border} />
          <Text style={[styles.reviewEmptyTitle, { marginTop: 20 }]}>You created this quiz</Text>
          <Text style={styles.reviewEmptySubtitle}>Creators cannot participate in their own quizzes.</Text>
        </View>
      </View>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];

  // ─── REVIEW MODE ───────────────────────────────────────────────────────────
  if (reviewMode) {
    const totalCorrect = quiz.questions.reduce((acc: number, q: any) => {
      const chosenId = myResponses[q.id];
      const correctOpt = q.options.find((o: any) => o.is_correct);
      return acc + (chosenId === correctOpt?.id ? 1 : 0);
    }, 0);

    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="close" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>{quiz.title}</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Score Banner */}
        <View style={styles.scoreBanner}>
          <MaterialCommunityIcons
            name={totalCorrect === quiz.questions.length ? 'trophy' : 'chart-bar'}
            size={28}
            color={totalCorrect === quiz.questions.length ? '#FFD700' : colors.primary}
          />
          <Text style={styles.scoreText}>
            {totalCorrect} / {quiz.questions.length} Correct
          </Text>
          <Text style={styles.scoreSubText}>
            {totalCorrect === quiz.questions.length ? 'Perfect score! 🎉' :
             totalCorrect >= quiz.questions.length / 2 ? 'Good effort! 👍' : 'Keep practicing! 💪'}
          </Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {quiz.questions.map((q: any, qIdx: number) => {
            const chosenId = myResponses[q.id];
            const correctOpt = q.options.find((o: any) => o.is_correct);
            const isCorrect = chosenId === correctOpt?.id;

            return (
              <View key={q.id} style={styles.reviewQuestionCard}>
                <View style={styles.reviewQuestionHeader}>
                  <View style={[styles.reviewBadge, isCorrect ? styles.reviewBadgeCorrect : styles.reviewBadgeWrong]}>
                    <MaterialCommunityIcons
                      name={isCorrect ? 'check' : 'close'}
                      size={14}
                      color="#fff"
                    />
                  </View>
                  <Text style={styles.reviewQuestionNum}>Q{qIdx + 1}</Text>
                </View>
                <Text style={styles.reviewQuestionText}>{q.text}</Text>

                {q.options.map((opt: any) => {
                  const isChosen = chosenId === opt.id;
                  const isCorrectOpt = opt.is_correct;

                  let optStyle = styles.reviewOptDefault;
                  let textStyle = styles.reviewOptTextDefault;
                  let icon: any = null;

                  if (isCorrectOpt) {
                    optStyle = styles.reviewOptCorrect;
                    textStyle = styles.reviewOptTextCorrect;
                    icon = <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />;
                  } else if (isChosen && !isCorrectOpt) {
                    optStyle = styles.reviewOptWrong;
                    textStyle = styles.reviewOptTextWrong;
                    icon = <MaterialCommunityIcons name="close-circle" size={20} color="#F44336" />;
                  }

                  return (
                    <View key={opt.id} style={[styles.reviewOpt, optStyle]}>
                      <Text style={[styles.reviewOptText, textStyle]}>{opt.text}</Text>
                      {icon}
                    </View>
                  );
                })}

                {/* Explanation */}
                {q.explanation ? (
                  <View style={styles.explanationBox}>
                    <MaterialCommunityIcons name="lightbulb-outline" size={16} color="#FF9800" />
                    <Text style={styles.explanationText}>{q.explanation}</Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  // ─── QUIZ TAKING MODE ───────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="close" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{quiz.title}</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.progress}>
        <Text style={styles.progressText}>Question {currentQuestionIndex + 1} of {quiz.questions.length}</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }]} />
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        <Text style={styles.questionText}>{currentQuestion.text}</Text>
        {currentQuestion.options.map((option: any) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.optionBtn,
              selectedOptions[currentQuestion.id] === option.id && styles.optionBtnActive,
            ]}
            onPress={() => handleSelect(currentQuestion.id, option.id)}
          >
            <Text style={[
              styles.optionText,
              selectedOptions[currentQuestion.id] === option.id && styles.optionTextActive,
            ]}>
              {option.text}
            </Text>
            {selectedOptions[currentQuestion.id] === option.id && (
              <MaterialCommunityIcons name="check-circle" size={24} color={colors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        {currentQuestionIndex > 0 && (
          <TouchableOpacity style={styles.navBtn} onPress={() => setCurrentQuestionIndex(prev => prev - 1)}>
            <Text style={styles.navBtnText}>Previous</Text>
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }} />
        {currentQuestionIndex < quiz.questions.length - 1 ? (
          <TouchableOpacity
            style={[styles.navBtn, styles.nextBtn]}
            onPress={() => setCurrentQuestionIndex(prev => prev + 1)}
          >
            <Text style={[styles.navBtnText, styles.nextBtnText]}>Next</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.navBtn, styles.submitBtn]} onPress={handleSubmit}>
            <Text style={styles.submitBtnText}>Submit Quiz</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { color: colors.textPrimary, fontSize: 18, fontWeight: 'bold' },
  progress: { padding: 20 },
  progressText: { color: colors.textSecondary, fontSize: 13, marginBottom: 8 },
  progressBar: { height: 6, backgroundColor: colors.surface, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary },
  content: { paddingHorizontal: 20, paddingBottom: 20 },
  questionText: { color: colors.textPrimary, fontSize: 22, fontWeight: 'bold', marginBottom: 30, lineHeight: 30 },
  optionBtn: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.surface, padding: 18, borderRadius: 12, marginBottom: 15,
    borderWidth: 1, borderColor: colors.border,
  },
  optionBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary + '11' },
  optionText: { color: colors.textPrimary, fontSize: 16, flex: 1 },
  optionTextActive: { color: colors.primary, fontWeight: 'bold' },
  footer: {
    flexDirection: 'row', padding: 20, paddingBottom: 40, borderTopWidth: 1, borderTopColor: colors.border,
  },
  navBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 },
  navBtnText: { color: colors.textSecondary, fontWeight: 'bold' },
  nextBtn: { backgroundColor: colors.primary },
  nextBtnText: { color: '#fff' },
  submitBtn: { backgroundColor: colors.primary, paddingHorizontal: 30 },
  submitBtnText: { color: '#fff', fontWeight: 'bold' },
  error: { color: '#F44336', fontSize: 16 },

  // Score Banner
  scoreBanner: {
    margin: 16, padding: 20, backgroundColor: colors.surface, borderRadius: 16,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  scoreText: { color: colors.textPrimary, fontSize: 28, fontWeight: 'bold', marginTop: 10 },
  scoreSubText: { color: colors.textSecondary, fontSize: 14, marginTop: 6 },

  // Review mode
  reviewQuestionCard: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  reviewQuestionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  reviewBadge: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  reviewBadgeCorrect: { backgroundColor: '#4CAF50' },
  reviewBadgeWrong: { backgroundColor: '#F44336' },
  reviewQuestionNum: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
  reviewQuestionText: { color: colors.textPrimary, fontSize: 17, fontWeight: '600', marginBottom: 14, lineHeight: 24 },
  reviewOpt: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 14, borderRadius: 10, marginBottom: 10, borderWidth: 1,
  },
  reviewOptDefault: { backgroundColor: colors.background, borderColor: colors.border },
  reviewOptCorrect: { backgroundColor: '#4CAF5015', borderColor: '#4CAF50' },
  reviewOptWrong: { backgroundColor: '#F4433615', borderColor: '#F44336' },
  reviewOptText: { fontSize: 15, flex: 1 },
  reviewOptTextDefault: { color: colors.textSecondary },
  reviewOptTextCorrect: { color: '#4CAF50', fontWeight: '600' },
  reviewOptTextWrong: { color: '#F44336', fontWeight: '600' },

  // Explanation
  explanationBox: {
    flexDirection: 'row', alignItems: 'flex-start', marginTop: 12,
    backgroundColor: '#FF980015', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#FF9800',
  },
  explanationText: { color: '#E65100', fontSize: 13, flex: 1, marginLeft: 8, lineHeight: 20 },

  // Creator blocked
  reviewEmptyTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  reviewEmptySubtitle: { color: colors.textSecondary, fontSize: 14, marginTop: 8, textAlign: 'center' },
});
