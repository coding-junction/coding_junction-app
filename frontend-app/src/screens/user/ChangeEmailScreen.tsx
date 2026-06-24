import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { api, setAuthToken } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';

export default function ChangeEmailScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const login = useAuthStore((state) => state.login);
  const token = useAuthStore((state) => state.token);
  
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [newEmail, setNewEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async () => {
    if (!newEmail) {
      Alert.alert('Error', 'Please enter new email');
      return;
    }
    if (!newEmail.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email');
      return;
    }

    setLoading(true);
    try {
      await api.post('/users/me/request-email-otp', { new_email: newEmail });
      Alert.alert('OTP Sent', 'Check your new email for the verification code');
      setStep('otp');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!otp) {
      Alert.alert('Error', 'Please enter the OTP');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/users/me/verify-email-change', {
        new_email: newEmail,
        otp_code: otp
      });
      Alert.alert('Success', 'Email changed successfully!');
      
      // Update user in store
      const userRes = await api.get('/users/me');
      if (token) {
        login(userRes.data, token);
      }
      
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to change email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Change Email</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {step === 'email' ? (
          <>
            <View style={styles.card}>
              <MaterialCommunityIcons name="email-edit" size={32} color={colors.primary} style={styles.icon} />
              <Text style={styles.subtitle}>Enter your new email address</Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>New Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="your-new-email@example.com"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                value={newEmail}
                onChangeText={setNewEmail}
              />
            </View>

            <View style={styles.infoBox}>
              <MaterialCommunityIcons name="information" size={20} color={colors.primary} />
              <Text style={styles.infoText}>We'll send an OTP to your new email to verify the change</Text>
            </View>

            <TouchableOpacity 
              style={styles.button}
              onPress={handleRequestOtp}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : (
                <Text style={styles.buttonText}>Send OTP</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.card}>
              <MaterialCommunityIcons name="email-receive" size={32} color={colors.primary} style={styles.icon} />
              <Text style={styles.subtitle}>Enter the OTP sent to {newEmail}</Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>OTP Code</Text>
              <TextInput
                style={styles.input}
                placeholder="6-digit code"
                placeholderTextColor={colors.textSecondary}
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={setOtp}
              />
            </View>

            <TouchableOpacity 
              style={styles.button}
              onPress={handleChangeEmail}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : (
                <Text style={styles.buttonText}>Verify & Change Email</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.backBtn}
              onPress={() => setStep('email')}
            >
              <Text style={styles.backText}>← Back to Email Entry</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 16,
    borderBottomWidth: 1, borderColor: colors.border
  },
  title: { color: colors.textPrimary, fontSize: 18, fontWeight: 'bold' },
  content: { padding: 20 },
  card: { alignItems: 'center', marginBottom: 30 },
  icon: { marginBottom: 15 },
  subtitle: { color: colors.textSecondary, fontSize: 16, textAlign: 'center' },
  fieldGroup: { marginBottom: 18 },
  label: { color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: colors.surface, color: colors.textPrimary, borderRadius: 10, padding: 14, fontSize: 15, borderWidth: 1, borderColor: colors.border },
  infoBox: { flexDirection: 'row', backgroundColor: colors.primary + '15', padding: 12, borderRadius: 10, marginBottom: 20, borderLeftWidth: 3, borderLeftColor: colors.primary },
  infoText: { color: colors.textSecondary, fontSize: 13, marginLeft: 10, flex: 1 },
  button: { backgroundColor: colors.primary, padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  backBtn: { alignItems: 'center', paddingVertical: 15, marginTop: 20 },
  backText: { color: colors.primary, fontWeight: '600' },
});
