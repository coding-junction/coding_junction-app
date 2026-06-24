import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, SafeAreaView, Image, ActivityIndicator, Alert, Modal
} from 'react-native';
import { colors } from '../../theme/colors';
import { api } from '../../services/api';

const logo = require('../../../assets/logo.png');

export default function OtpVerificationScreen({ navigation, route }: any) {
  const { email } = route.params || {};
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter the 6-digit code.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/verify-otp', { email, otp_code: otp });
      Alert.alert('✅ Verified!', 'Your email has been verified. Please log in.', [
        { text: 'Login', onPress: () => navigation.navigate('Login') }
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await api.post(`/auth/resend-otp?email=${encodeURIComponent(email)}`);
      Alert.alert('Sent!', 'A new OTP has been sent to your email.');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Could not resend OTP.');
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <View style={styles.container}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />

          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>
            We sent a 6-digit code to{'\n'}
            <Text style={styles.emailHighlight}>{email}</Text>
          </Text>

          {/* OTP Boxes */}
          <TextInput
            style={styles.otpInput}
            value={otp}
            onChangeText={setOtp}
            placeholder="_ _ _ _ _ _"
            placeholderTextColor={colors.textSecondary}
            keyboardType="number-pad"
            maxLength={6}
            textAlign="center"
          />

          <TouchableOpacity style={styles.button} onPress={handleVerify} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.buttonText}>Verify OTP</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.resendBtn} onPress={handleResend} disabled={resending}>
            <Text style={styles.resendText}>
              {resending ? 'Sending...' : "Didn't receive it? Resend OTP"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.backBtn}>
            <Text style={styles.backText}>← Back to Login</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Loading Overlay Modal */}
      {(loading || resending) && (
        <Modal transparent visible={loading || resending} animationType="fade">
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>
                {resending ? 'Sending OTP...' : 'Verifying OTP...'}
              </Text>
              <Text style={styles.loadingSubtext}>Please wait a moment.</Text>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  logo: { width: 80, height: 80, marginBottom: 32, tintColor: colors.primary },
  title: { fontSize: 26, fontWeight: 'bold', color: colors.textPrimary, textAlign: 'center' },
  subtitle: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', marginTop: 8, marginBottom: 32, lineHeight: 22 },
  emailHighlight: { color: colors.primary, fontWeight: 'bold' },
  otpInput: {
    width: '100%',
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    borderRadius: 12,
    padding: 20,
    fontSize: 28,
    letterSpacing: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
  },
  button: {
    width: '100%',
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  resendBtn: { marginTop: 20 },
  resendText: { color: colors.primary, fontSize: 14 },
  backBtn: { marginTop: 24 },
  backText: { color: colors.textSecondary, fontSize: 13 },
  loadingOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  loadingBox: { backgroundColor: colors.surface, padding: 30, borderRadius: 20, alignItems: 'center', width: '80%', borderWidth: 1, borderColor: colors.border },
  loadingText: { color: colors.textPrimary, fontSize: 18, fontWeight: 'bold', marginTop: 15, textAlign: 'center' },
  loadingSubtext: { color: colors.textSecondary, fontSize: 13, marginTop: 8, textAlign: 'center' }
});
