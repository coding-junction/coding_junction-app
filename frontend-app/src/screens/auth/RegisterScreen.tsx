import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, Image, ActivityIndicator, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { registerUser } from '../../services/api';

const logo = require('../../../assets/logo.png');

export default function RegisterScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!email.trim() || !password || !name.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await registerUser(email.trim(), password, name.trim());
      // Navigate to OTP screen
      navigation.navigate('OtpVerification', { email: email.trim() });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <View style={styles.header}>
            <Image source={logo} style={styles.logo} resizeMode="contain" />
            <Text style={styles.brand}>CODING JUNCTION</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Join the Club 🚀</Text>
            <Text style={styles.subtitle}>Create your account to get started</Text>

            {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Your Name"
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />

            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.label}>Password</Text>
            <View style={styles.passWrapper}>
              <TextInput
                style={styles.passInput}
                placeholder="Min. 6 characters"
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                <Text style={styles.eyeText}>{showPass ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
              {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonText}>Send Verification OTP</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.linkText}>Already a member? <Text style={styles.linkAccent}>Sign In</Text></Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footer}>By signing up, you agree to CJ's community guidelines.</Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Loading Overlay Modal */}
      {loading && (
        <Modal transparent visible={loading} animationType="fade">
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Creating Account...</Text>
              <Text style={styles.loadingSubtext}>Please wait while we set up your profile and send the verification OTP.</Text>
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
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  header: { alignItems: 'center', marginBottom: 28 },
  logo: { width: 70, height: 70, tintColor: colors.primary },
  brand: { color: colors.primary, fontSize: 18, fontWeight: '900', letterSpacing: 4, marginTop: 10 },
  card: { backgroundColor: colors.surface, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: colors.border },
  title: { fontSize: 24, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 24 },
  errorBox: { backgroundColor: colors.error + '22', borderRadius: 8, padding: 12, marginBottom: 16 },
  errorText: { color: colors.error, fontSize: 13, textAlign: 'center' },
  label: { color: colors.textSecondary, fontSize: 13, marginBottom: 6, fontWeight: '600' },
  input: {
    backgroundColor: colors.background, color: colors.textPrimary, borderRadius: 10,
    padding: 14, fontSize: 15, borderWidth: 1, borderColor: colors.border, marginBottom: 16,
  },
  passWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background,
    borderRadius: 10, borderWidth: 1, borderColor: colors.border, marginBottom: 24,
  },
  passInput: { flex: 1, color: colors.textPrimary, padding: 14, fontSize: 15 },
  eyeBtn: { padding: 12 },
  eyeText: { fontSize: 18 },
  button: { backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonText: { color: '#0E0A12', fontWeight: 'bold', fontSize: 16 },
  linkBtn: { marginTop: 20, alignItems: 'center' },
  linkText: { color: colors.textSecondary, fontSize: 14 },
  linkAccent: { color: colors.primary, fontWeight: 'bold' },
  footer: { color: colors.textSecondary, fontSize: 11, textAlign: 'center', marginTop: 24, opacity: 0.6 },
  loadingOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  loadingBox: { backgroundColor: colors.surface, padding: 30, borderRadius: 20, alignItems: 'center', width: '80%', borderWidth: 1, borderColor: colors.border },
  loadingText: { color: colors.textPrimary, fontSize: 18, fontWeight: 'bold', marginTop: 15, textAlign: 'center' },
  loadingSubtext: { color: colors.textSecondary, fontSize: 13, marginTop: 8, textAlign: 'center' }
});
