import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Button, AppState, Alert } from 'react-native';
import { useTestStore } from '../../store/useTestStore';
import { api } from '../../services/api';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { colors } from '../../theme/colors';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'ActiveTest'>;
};

export default function ActiveTestScreen({ navigation }: Props) {
  const appState = useRef(AppState.currentState);
  const { violations, pending_lockdown, submissionId, addViolation, setPendingLockdown, clearTest } = useTestStore();

  useEffect(() => {
    // If returning to the app and pending_lockdown is true from previous session
    if (pending_lockdown) {
      triggerOfflineQueue();
    }

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/active/) &&
        nextAppState.match(/inactive|background/)
      ) {
        // User left the app!
        handleViolation();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleViolation = () => {
    addViolation();
    const currentViolations = useTestStore.getState().violations;
    
    if (currentViolations >= 3) {
      setPendingLockdown(true);
      triggerOfflineQueue();
    } else {
      Alert.alert(
        "Warning!", 
        `You left the app during a test. Violations: ${currentViolations}/3`
      );
    }
  };

  const triggerOfflineQueue = async () => {
    Alert.alert("Locked!", "You have exceeded maximum violations. Attempting to auto-submit to server...");
    try {
      if (submissionId) {
        await api.post('/tests/violations', {
          submission_id: submissionId,
          event: {
            timestamp: new Date().toISOString(),
            event_type: 'app_switch',
            description: 'User forced application to background repeatedly'
          }
        });
      }
      
      Alert.alert("Submitted", "Test has been auto-submitted.");
      clearTest();
      navigation.goBack();
    } catch (error) {
      Alert.alert("Network Error", "Auto-submit failed. The UI will remain locked until connection is restored.");
      // pending_lockdown remains true, UI stays locked
    }
  };

  if (pending_lockdown) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Test Locked</Text>
        <Text style={styles.subtitle}>You exceeded the maximum allowed app switches.</Text>
        <Button title="Retry Auto-Submit" onPress={triggerOfflineQueue} color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Active Test</Text>
      <Text style={styles.subtitle}>Do not leave this app.</Text>
      <Text style={styles.violationText}>Violations: {violations}/3</Text>
      <View style={{ height: 40 }} />
      <Button title="Simulate App Switch" onPress={handleViolation} color={colors.warning} />
      <View style={{ height: 20 }} />
      <Button title="Submit Manually" onPress={() => { clearTest(); navigation.goBack(); }} color={colors.success} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: 20 },
  title: { color: colors.textPrimary, fontSize: 24, marginBottom: 10 },
  subtitle: { color: colors.textSecondary, fontSize: 16, textAlign: 'center', marginBottom: 20 },
  violationText: { color: colors.error, fontSize: 18, fontWeight: 'bold' },
});
