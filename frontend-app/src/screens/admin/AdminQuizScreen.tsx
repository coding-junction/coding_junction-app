import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, 
  Alert, ActivityIndicator, Switch 
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';

export default function AdminQuizScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);

  if (!user || (!user.is_admin && !user.is_core_member)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <Text style={{ color: colors.error, fontSize: 16, fontWeight: 'bold' }}>Access Denied</Text>
      </View>
    );
  }

  const quizId = route?.params?.quizId;
  const pollId = route?.params?.pollId;
  const isEdit = !!quizId || !!pollId;

  const [mode, setMode] = useState<'quiz' | 'poll'>('quiz');
  const [loading, setLoading] = useState(false);

  // Quiz State
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDesc, setQuizDesc] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [questions, setQuestions] = useState<any[]>([
    { text: '', explanation: '', options: [{ text: '', is_correct: true }, { text: '', is_correct: false }] }
  ]);

  // Poll State
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);

  // Fetch data if editing
  useEffect(() => {
    if (quizId) {
      setMode('quiz');
      setLoading(true);
      api.get(`/quiz/${quizId}`)
        .then(res => {
          setQuizTitle(res.data.title);
          setQuizDesc(res.data.description || '');
          setIsPublished(res.data.is_published);
          if (res.data.questions && res.data.questions.length > 0) {
            setQuestions(res.data.questions.map((q: any) => ({
              text: q.text,
              explanation: q.explanation || '',
              options: q.options.map((o: any) => ({ text: o.text, is_correct: o.is_correct }))
            })));
          }
        })
        .catch(err => {
          Alert.alert('Error', 'Failed to fetch quiz details.');
        })
        .finally(() => setLoading(false));
    } else if (pollId) {
      setMode('poll');
      setLoading(true);
      api.get(`/poll/${pollId}`)
        .then(res => {
          setPollQuestion(res.data.question);
          setIsPublished(res.data.is_published);
          if (res.data.options && res.data.options.length > 0) {
            setPollOptions(res.data.options.map((o: any) => o.text));
          }
        })
        .catch(err => {
          Alert.alert('Error', 'Failed to fetch poll details.');
        })
        .finally(() => setLoading(false));
    }
  }, [quizId, pollId]);

  const addQuestion = () => {
    setQuestions([...questions, { text: '', explanation: '', options: [{ text: '', is_correct: true }, { text: '', is_correct: false }] }]);
  };

  const addOption = (qIndex: number) => {
    const newQs = [...questions];
    newQs[qIndex].options.push({ text: '', is_correct: false });
    setQuestions(newQs);
  };

  const handleSaveQuiz = async () => {
    if (!quizTitle || questions.some(q => !q.text)) {
      Alert.alert('Error', 'Please fill in all quiz details');
      return;
    }
    setLoading(true);
    try {
      if (isEdit) {
        await api.patch(`/quiz/${quizId}`, {
          title: quizTitle,
          description: quizDesc,
          is_published: isPublished,
          questions: questions
        });
        Alert.alert('Success', isPublished ? 'Quiz published!' : 'Quiz updated successfully');
      } else {
        await api.post('/quiz/', {
          title: quizTitle,
          description: quizDesc,
          is_published: isPublished,
          questions: questions
        });
        Alert.alert('Success', isPublished ? 'Quiz published!' : 'Quiz saved as draft');
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', 'Failed to save quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePoll = async () => {
    if (!pollQuestion || pollOptions.some(o => !o)) {
      Alert.alert('Error', 'Please fill in all poll details');
      return;
    }
    setLoading(true);
    try {
      if (isEdit) {
        await api.patch(`/poll/${pollId}`, {
          question: pollQuestion,
          options: pollOptions,
          is_published: isPublished
        });
        Alert.alert('Success', isPublished ? 'Poll published!' : 'Poll updated successfully');
      } else {
        await api.post('/poll/', {
          question: pollQuestion,
          options: pollOptions,
          is_published: isPublished
        });
        Alert.alert('Success', isPublished ? 'Poll published!' : 'Poll saved as draft');
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', 'Failed to save poll');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? `Edit ${mode === 'quiz' ? 'Quiz' : 'Poll'}` : 'Create Content'}</Text>
        <View style={{ width: 24 }} />
      </View>

      {!isEdit && (
        <View style={styles.modeTabs}>
          <TouchableOpacity 
            style={[styles.tab, mode === 'quiz' && styles.tabActive]} 
            onPress={() => setMode('quiz')}
          >
            <Text style={[styles.tabText, mode === 'quiz' && styles.tabTextActive]}>Quiz</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, mode === 'poll' && styles.tabActive]} 
            onPress={() => setMode('poll')}
          >
            <Text style={[styles.tabText, mode === 'poll' && styles.tabTextActive]}>Poll</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.publishRow}>
          <Text style={styles.publishLabel}>Directly Publish (Notify all users)</Text>
          <Switch 
            value={isPublished} 
            onValueChange={setIsPublished} 
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        {mode === 'quiz' ? (
          <View>
            <TextInput 
              style={styles.input} 
              placeholder="Quiz Title" 
              placeholderTextColor={colors.textSecondary}
              value={quizTitle}
              onChangeText={setQuizTitle}
            />
            <TextInput 
              style={[styles.input, { height: 80 }]} 
              placeholder="Description (Optional)" 
              placeholderTextColor={colors.textSecondary}
              multiline
              value={quizDesc}
              onChangeText={setQuizDesc}
            />

            {questions.map((q, qIndex) => (
              <View key={qIndex} style={styles.questionBox}>
                <Text style={styles.qLabel}>Question {qIndex + 1}</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="Enter question" 
                  placeholderTextColor={colors.textSecondary}
                  value={q.text}
                  onChangeText={(val) => {
                    const newQs = [...questions];
                    newQs[qIndex].text = val;
                    setQuestions(newQs);
                  }}
                />
                {q.options.map((o: any, oIndex: number) => (
                  <View key={oIndex} style={styles.optionRow}>
                    <TouchableOpacity 
                      onPress={() => {
                        const newQs = [...questions];
                        newQs[qIndex].options.forEach((opt: any, i: number) => opt.is_correct = i === oIndex);
                        setQuestions(newQs);
                      }}
                    >
                      <MaterialCommunityIcons 
                        name={o.is_correct ? "radiobox-marked" : "radiobox-blank"} 
                        size={24} 
                        color={o.is_correct ? colors.primary : colors.textSecondary} 
                      />
                    </TouchableOpacity>
                    <TextInput 
                      style={[styles.input, { flex: 1, marginBottom: 0, marginLeft: 10 }]} 
                      placeholder={`Option ${oIndex + 1}`} 
                      placeholderTextColor={colors.textSecondary}
                      value={o.text}
                      onChangeText={(val) => {
                        const newQs = [...questions];
                        newQs[qIndex].options[oIndex].text = val;
                        setQuestions(newQs);
                      }}
                    />
                  </View>
                ))}
                <TouchableOpacity style={styles.addOptionBtn} onPress={() => addOption(qIndex)}>
                  <Text style={styles.addOptionText}>+ Add Option</Text>
                </TouchableOpacity>

                <TextInput 
                  style={[styles.input, { marginTop: 10, marginBottom: 5 }]} 
                  placeholder="Explanation (Optional)" 
                  placeholderTextColor={colors.textSecondary}
                  value={q.explanation}
                  onChangeText={(val) => {
                    const newQs = [...questions];
                    newQs[qIndex].explanation = val;
                    setQuestions(newQs);
                  }}
                />
              </View>
            ))}

            <TouchableOpacity style={styles.addQBtn} onPress={addQuestion}>
              <Text style={styles.addQText}>+ Add Question</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.submitBtn} onPress={handleSaveQuiz} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{isEdit ? 'Update Quiz' : 'Create Quiz'}</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <TextInput 
              style={[styles.input, { height: 100 }]} 
              placeholder="What's your question?" 
              placeholderTextColor={colors.textSecondary}
              multiline
              value={pollQuestion}
              onChangeText={setPollQuestion}
            />
            {pollOptions.map((o, index) => (
              <TextInput 
                key={index}
                style={styles.input} 
                placeholder={`Option ${index + 1}`} 
                placeholderTextColor={colors.textSecondary}
                value={o}
                onChangeText={(val) => {
                  const newOps = [...pollOptions];
                  newOps[index] = val;
                  setPollOptions(newOps);
                }}
              />
            ))}
            <TouchableOpacity 
              style={styles.addOptionBtn} 
              onPress={() => setPollOptions([...pollOptions, ''])}
            >
              <Text style={styles.addOptionText}>+ Add Option</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.submitBtn} onPress={handleSavePoll} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{isEdit ? 'Update Poll' : 'Create Poll'}</Text>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 15, borderBottomWidth: 1, borderColor: colors.border
  },
  backBtn: { padding: 4 },
  headerTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: 'bold' },
  modeTabs: { flexDirection: 'row', padding: 16, gap: 12 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.textSecondary, fontWeight: 'bold' },
  tabTextActive: { color: '#fff' },
  scroll: { padding: 20 },
  publishRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, backgroundColor: colors.surface, padding: 15, borderRadius: 12 },
  publishLabel: { color: colors.textPrimary, fontWeight: '600' },
  input: { 
    backgroundColor: colors.surface, color: colors.textPrimary, padding: 15, borderRadius: 12, 
    borderWidth: 1, borderColor: colors.border, marginBottom: 15, fontSize: 16 
  },
  questionBox: { backgroundColor: colors.surface, padding: 15, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: colors.border },
  qLabel: { color: colors.primary, fontWeight: 'bold', marginBottom: 10 },
  optionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  addOptionBtn: { paddingVertical: 8 },
  addOptionText: { color: colors.primary, fontWeight: '600' },
  addQBtn: { backgroundColor: colors.surface, padding: 15, borderRadius: 12, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: colors.primary, marginBottom: 30 },
  addQText: { color: colors.primary, fontWeight: 'bold' },
  submitBtn: { backgroundColor: colors.primary, padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  submitText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});
