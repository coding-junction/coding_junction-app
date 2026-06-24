import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { api } from '../../services/api';

import { useAuthStore } from '../../store/useAuthStore';

export default function PollDetailScreen({ route, navigation }: any) {
  const { pollId } = route.params;
  const user = useAuthStore((state) => state.user);
  const insets = useSafeAreaInsets();
  const [poll, setPoll] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState<any[]>([]);
  const [canViewResults, setCanViewResults] = useState(false);

  useEffect(() => {
    fetchPollAndData();
  }, []);

  const fetchPollAndData = async () => {
    try {
      const res = await api.get(`/poll/${pollId}`);
      setPoll(res.data);

      try {
        const respRes = await api.get(`/poll/${pollId}/responses`);
        setResponses(respRes.data);
        
        const hasVoted = respRes.data.some((r: any) => r.user_id === user?.id);
        const isCreator = res.data.creator_id === user?.id;
        
        setCanViewResults(isCreator || hasVoted);
      } catch (err: any) {
        setCanViewResults(false);
      }

    } catch (e) {
      Alert.alert('Error', 'Failed to load poll');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (optionId: string) => {
    try {
      await api.post(`/poll/${pollId}/vote?option_id=${optionId}`);
      Alert.alert('Success', 'Thank you for voting!');
      fetchPollAndData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Voting failed');
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  if (!poll) return <View style={styles.center}><Text style={styles.error}>Poll not found</Text></View>;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Live Poll</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.pollCard}>
          <MaterialCommunityIcons name="poll" size={40} color={colors.primary} style={styles.icon} />
          <Text style={styles.questionText}>{poll.question}</Text>
          <Text style={styles.subText}>
            {canViewResults ? 'Live Results' : poll.creator_id === user?.id ? 'You created this poll. Waiting for votes...' : 'Select an option to cast your vote'}
          </Text>
        </View>

        {poll.options && poll.options.map((option: any) => {
          if (canViewResults) {
            const optionVoters = responses.filter(r => r.option_id === option.id);
            const votesCount = optionVoters.length;
            const totalVotes = responses.length || 1;
            const percentage = Math.round((votesCount / totalVotes) * 100);
            
            return (
              <View key={option.id} style={styles.resultRow}>
                <View style={styles.resultHeader}>
                  <Text style={styles.resultOptionText}>{option.text}</Text>
                  <Text style={styles.resultPercentText}>{percentage}% ({votesCount})</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${percentage}%` }]} />
                </View>
                
                {optionVoters.length > 0 && (
                  <View style={styles.votersContainer}>
                    <View style={styles.votersList}>
                      {optionVoters.map((voter: any) => (
                        <View key={voter.id} style={styles.voterChip}>
                          <Text style={styles.voterName}>{voter.user?.full_name}</Text>
                          <View style={[
                            styles.roleBadge,
                            voter.user?.role_tag === 'Admin' && styles.badgeAdmin,
                            voter.user?.role_tag === 'Core Member' && styles.badgeCore,
                            voter.user?.role_tag === 'Verified Student' && styles.badgeVerified,
                            voter.user?.role_tag === 'Student (Unverified)' && styles.badgeUnverified
                          ]}>
                            <Text style={styles.roleText}>{voter.user?.role_tag}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            );
          }

          if (poll.creator_id === user?.id) {
             return (
               <View key={option.id} style={[styles.optionBtn, { opacity: 0.7 }]}>
                 <Text style={styles.optionText}>{option.text}</Text>
               </View>
             );
          }

          return (
            <TouchableOpacity
              key={option.id}
              style={styles.optionBtn}
              onPress={() => handleVote(option.id)}
            >
              <Text style={styles.optionText}>{option.text}</Text>
              <MaterialCommunityIcons name="chevron-right" size={24} color={colors.primary} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    paddingHorizontal: 20, paddingVertical: 15
  },
  title: { color: colors.textPrimary, fontSize: 18, fontWeight: 'bold' },
  content: { flex: 1, padding: 20 },
  pollCard: { alignItems: 'center', marginBottom: 40 },
  icon: { marginBottom: 15 },
  questionText: { color: colors.textPrimary, fontSize: 24, fontWeight: 'bold', textAlign: 'center', lineHeight: 32 },
  subText: { color: colors.textSecondary, fontSize: 14, marginTop: 10 },
  optionBtn: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.surface, padding: 20, borderRadius: 16, marginBottom: 15,
    borderWidth: 1, borderColor: colors.border
  },
  optionText: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
  resultRow: { marginBottom: 20, backgroundColor: colors.surface, padding: 15, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  resultOptionText: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  resultPercentText: { color: colors.primary, fontSize: 15, fontWeight: 'bold' },
  progressTrack: { height: 12, backgroundColor: colors.background, borderRadius: 6, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary },
  error: { color: colors.error, fontSize: 16 },
  votersContainer: { marginTop: 10, borderTopWidth: 1, borderColor: colors.border, paddingTop: 10 },
  votersList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  voterChip: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: colors.border,
    gap: 4
  },
  voterName: { color: colors.textPrimary, fontSize: 11, fontWeight: '600' },
  roleBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeAdmin: { backgroundColor: '#F4433622' },
  badgeCore: { backgroundColor: '#FF980022' },
  badgeVerified: { backgroundColor: '#4CAF5022' },
  badgeUnverified: { backgroundColor: '#9E9E9E22' },
  roleText: { fontSize: 8, fontWeight: '800', color: colors.textSecondary },
});
