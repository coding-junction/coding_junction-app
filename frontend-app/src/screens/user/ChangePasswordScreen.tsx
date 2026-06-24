import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { api } from '../../services/api';

export default function ChangePasswordScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<'password' | 'otp'>('password');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill all password fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await api.post('/users/me/request-password-otp');
      Alert.alert('OTP Sent', 'Check your email for the verification code');
      setStep('otp');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to request OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!otp) {
      Alert.alert('Error', 'Please enter the OTP');
      return;
    }

    setLoading(true);
    try {
      await api.post('/users/me/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
        otp_code: otp
      });
      Alert.alert('Success', 'Password changed successfully!');
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to change password');
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
        <Text style={styles.title}>Change Password</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {step === 'password' ? (
          <>
            <View style={styles.card}>
              <MaterialCommunityIcons name="lock" size={32} color={colors.primary} style={styles.icon} />
              <Text style={styles.subtitle}>Enter your passwords below</Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Current Password</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Current password"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry={!showCurrent}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                />
                <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)} style={styles.eyeBtn}>
                  <MaterialCommunityIcons name={showCurrent ? 'eye' : 'eye-off'} size={20} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="New password (min. 6 chars)"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry={!showNew}
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
                <TouchableOpacity onPress={() => setShowNew(!showNew)} style={styles.eyeBtn}>
                  <MaterialCommunityIcons name={showNew ? 'eye' : 'eye-off'} size={20} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Confirm New Password</Text>
              <TextInput
                style={styles.inputPlain}
                placeholder="Confirm new password"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showNew}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>

            <TouchableOpacity 
              style={styles.button}
              onPress={handleRequestOtp}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : (
                <Text style={styles.buttonText}>Send OTP to Email</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.card}>
              <MaterialCommunityIcons name="email" size={32} color={colors.primary} style={styles.icon} />
              <Text style={styles.subtitle}>Enter the OTP sent to your email</Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>OTP Code</Text>
              <TextInput
                style={styles.inputPlain}
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
              onPress={handleChangePassword}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : (
                <Text style={styles.buttonText}>Verify & Change Password</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.backBtn}
              onPress={() => setStep('password')}
            >
              <Text style={styles.backText}>← Back to Password Entry</Text>
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
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  input: { flex: 1, color: colors.textPrimary, padding: 14, fontSize: 15 },
  inputPlain: { backgroundColor: colors.surface, color: colors.textPrimary, borderRadius: 10, padding: 14, fontSize: 15, borderWidth: 1, borderColor: colors.border },
  eyeBtn: { paddingHorizontal: 12 },
  button: { backgroundColor: colors.primary, padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  backBtn: { alignItems: 'center', paddingVertical: 15, marginTop: 20 },
  backText: { color: colors.primary, fontWeight: '600' },
});
