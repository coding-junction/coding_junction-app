import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, TextInput, Modal, Alert, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { api, ROOT_URL, resolveMediaURL } from '../../services/api';

import { useAuthStore } from '../../store/useAuthStore';

export default function AdminUserDetailScreen({ route, navigation }: any) {
  const { userId } = route.params;
  const insets = useSafeAreaInsets();
  const currentUser = useAuthStore((state) => state.user);

  if (!currentUser || !currentUser.is_admin) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <Text style={{ color: colors.error, fontSize: 16, fontWeight: 'bold' }}>Access Denied</Text>
      </View>
    );
  }

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [actionType, setActionType] = useState<string>('');
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await api.get(`/users/${userId}`);
      setUser(res.data);
    } catch (e) {
      console.log('Error fetching user detail', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAction = async (type: string) => {
    Alert.alert(
      'Confirm Action Request',
      `Are you sure you want to ${type.replace('_', ' ')}? This will send an OTP to your admin email.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request OTP',
          onPress: async () => {
            setActionLoading(true);
            try {
              const formData = new FormData();
              formData.append('action_type', type);
              await api.post(`/users/${userId}/request-admin-action`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
              });
              setActionType(type);
              setOtpModalVisible(true);
            } catch (e: any) {
              Alert.alert('Error', e.response?.data?.detail || 'Failed to request action');
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleConfirmAction = async () => {
    if (!otpCode) {
      Alert.alert('Error', 'Please enter the OTP');
      return;
    }
    setActionLoading(true);
    try {
      const formData = new FormData();
      formData.append('action_type', actionType);
      formData.append('otp_code', otpCode);
      
      await api.post(`/users/${userId}/confirm-admin-action`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      Alert.alert('Success', `Action ${actionType.replace('_', ' ')} completed successfully!`);
      setOtpModalVisible(false);
      setOtpCode('');
      
      if (actionType === 'delete_user') {
        navigation.goBack();
      } else {
        fetchUser();
      }
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to confirm action');
    } finally {
      setActionLoading(false);
    }
  };

  const InfoRow = ({ label, value, icon }: any) => (
    <View style={styles.infoRow}>
      <MaterialCommunityIcons name={icon} size={20} color={colors.primary} />
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || 'Not provided'}</Text>
      </View>
    </View>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.avatarBlock}>
          <View style={styles.avatar}>
            {user?.profile_image_path ? (
              <Image 
                source={{ uri: resolveMediaURL(user.profile_image_path) || undefined }} 
                style={styles.avatarImage} 
              />
            ) : (
              <Text style={styles.avatarInitial}>{(user?.full_name || 'U')[0].toUpperCase()}</Text>
            )}
          </View>
          <Text style={styles.profileName}>{user?.full_name}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          <View style={[styles.badge, user.verification_status === 'verified' && styles.verifiedBadge]}>
            <Text style={[styles.badgeText, user.verification_status === 'verified' && styles.verifiedBadgeText]}>
              {user.verification_status?.toUpperCase() || 'UNVERIFIED'}
            </Text>
          </View>
          <View style={{marginTop: 5}}>
            <Text style={{color: colors.primary, fontWeight: 'bold'}}>{user.is_admin ? '⚡ Admin' : user.is_core_member ? '🌟 Core Member' : '🎓 Student'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Academic Information</Text>
          <InfoRow label="Roll Number" value={user.roll_no} icon="card-account-details-outline" />
          <InfoRow label="Batch" value={user.batch} icon="account-group-outline" />
          <InfoRow label="College" value={user.college_name} icon="school-outline" />
          <InfoRow label="Department" value={user.department} icon="office-building" />
          <InfoRow label="Year / Semester" value={`${user.year || '-'} / ${user.semester || '-'}`} icon="calendar-clock" />
          <InfoRow label="CGPA" value={user.cgpa?.toString()} icon="chart-bar" />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Interests</Text>
          <InfoRow label="Favorite Subjects" value={user.favorite_subjects} icon="star-outline" />
        </View>

        {user.id_card_path && user.id_card_path.trim() !== '' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Uploaded Document ({user.verification_document_type === 'fee_receipt' ? 'Fee Receipt' : 'ID Card'})</Text>
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => { setScale(1); setImageModalVisible(true); }}
              style={{ alignItems: 'center' }}
            >
              <Image 
                source={{ uri: resolveMediaURL(user.id_card_path) || undefined }} 
                style={styles.idPreview}
                resizeMode="contain"
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10 }}>
                <MaterialCommunityIcons name="magnify-plus-outline" size={16} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: 12, marginLeft: 5, fontWeight: '600' }}>Tap to Inspect & Zoom</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#F44336' }]}>Dangerous Admin Actions</Text>
          {user.id === currentUser?.id ? (
            <Text style={{ color: colors.textSecondary, fontSize: 14, fontStyle: 'italic', textAlign: 'center', marginVertical: 10 }}>
              You cannot perform admin actions on your own account.
            </Text>
          ) : (
            <>
              <Text style={{ color: colors.textSecondary, marginBottom: 15, fontSize: 12 }}>
                These actions require a 2-step OTP verification sent to your admin email address.
              </Text>
              
              {/* Demote Core/Student buttons if Admin */}
              {user.is_admin && (
                <>
                  <TouchableOpacity 
                    style={[styles.actionBtn, { borderColor: '#FF9800', borderWidth: 1 }]} 
                    onPress={() => handleRequestAction('demote_core')}
                    disabled={actionLoading}
                  >
                    <Text style={[styles.actionBtnText, { color: '#FF9800' }]}>Demote to Core Member</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.actionBtn, { borderColor: '#E91E63', borderWidth: 1 }]} 
                    onPress={() => handleRequestAction('demote_student')}
                    disabled={actionLoading}
                  >
                    <Text style={[styles.actionBtnText, { color: '#E91E63' }]}>Demote to Student</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Promote Admin/Demote Student if Core Member */}
              {user.is_core_member && !user.is_admin && (
                <>
                  <TouchableOpacity 
                    style={[styles.actionBtn, { borderColor: colors.primary, borderWidth: 1 }]} 
                    onPress={() => handleRequestAction('promote_admin')}
                    disabled={actionLoading}
                  >
                    <Text style={[styles.actionBtnText, { color: colors.primary }]}>Promote to Admin</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.actionBtn, { borderColor: '#E91E63', borderWidth: 1 }]} 
                    onPress={() => handleRequestAction('demote_student')}
                    disabled={actionLoading}
                  >
                    <Text style={[styles.actionBtnText, { color: '#E91E63' }]}>Demote to Student</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Promote Admin/Promote Core if Verified Student */}
              {!user.is_admin && !user.is_core_member && user.verification_status === 'verified' && (
                <>
                  <TouchableOpacity 
                    style={[styles.actionBtn, { borderColor: colors.primary, borderWidth: 1 }]} 
                    onPress={() => handleRequestAction('promote_admin')}
                    disabled={actionLoading}
                  >
                    <Text style={[styles.actionBtnText, { color: colors.primary }]}>Promote to Admin</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.actionBtn, { borderColor: '#FF9800', borderWidth: 1 }]} 
                    onPress={() => handleRequestAction('promote_core')}
                    disabled={actionLoading}
                  >
                    <Text style={[styles.actionBtnText, { color: '#FF9800' }]}>Promote to Core Member</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Unverified student has no promotion/demotion buttons (only Delete) */}

              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: '#F44336', marginTop: 8 }]} 
                onPress={() => handleRequestAction('delete_user')}
                disabled={actionLoading}
              >
                <Text style={[styles.actionBtnText, { color: '#fff' }]}>Delete User</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>

      {/* OTP Modal */}
      <Modal visible={otpModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Admin OTP</Text>
            <Text style={{color: colors.textSecondary, marginBottom: 20}}>
              An OTP has been sent to your admin email. Please enter it to confirm {actionType.replace('_', ' ')}.
            </Text>
            
            <TextInput
              style={styles.otpInput}
              placeholder="Enter OTP"
              placeholderTextColor={colors.textSecondary}
              value={otpCode}
              onChangeText={setOtpCode}
              keyboardType="number-pad"
            />
            
            <TouchableOpacity 
              style={styles.confirmBtn} 
              onPress={handleConfirmAction}
              disabled={actionLoading}
            >
              {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>Confirm Action</Text>}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.confirmBtn, { backgroundColor: 'transparent', marginTop: 10 }]} 
              onPress={() => setOtpModalVisible(false)}
            >
              <Text style={[styles.confirmBtnText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Fullscreen Zoomable Image Modal */}
      <Modal 
        visible={imageModalVisible} 
        transparent 
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View style={styles.fullscreenOverlay}>
          <TouchableOpacity style={styles.closeImageBtn} onPress={() => setImageModalVisible(false)}>
            <MaterialCommunityIcons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.imageWrapper}>
            {user?.id_card_path && (
              <Image 
                source={{ uri: resolveMediaURL(user.id_card_path) || undefined }} 
                style={[styles.fullscreenImage, { transform: [{ scale }] }]}
                resizeMode="contain"
              />
            )}
          </View>

          <View style={styles.zoomControls}>
            <TouchableOpacity 
              style={styles.zoomBtn} 
              onPress={() => setScale(prev => Math.max(prev - 0.25, 0.5))}
            >
              <MaterialCommunityIcons name="minus" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.zoomBtn, { marginHorizontal: 15 }]} 
              onPress={() => setScale(1)}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>{Math.round(scale * 100)}%</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.zoomBtn} 
              onPress={() => setScale(prev => Math.min(prev + 0.25, 4))}
            >
              <MaterialCommunityIcons name="plus" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Action Loading Overlay Modal */}
      <Modal transparent visible={actionLoading} animationType="fade">
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Processing request...</Text>
            <Text style={styles.loadingSubtext}>Please wait while we verify and send the security code.</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 15, borderBottomWidth: 1, borderColor: colors.border
  },
  backBtn: { padding: 4 },
  headerTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  scroll: { paddingBottom: 40 },
  avatarBlock: { alignItems: 'center', paddingVertical: 30 },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.primary + '22', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.primary },
  avatarInitial: { color: colors.primary, fontSize: 40, fontWeight: 'bold' },
  profileName: { color: colors.textPrimary, fontSize: 24, fontWeight: 'bold', marginTop: 15 },
  profileEmail: { color: colors.textSecondary, fontSize: 16, marginTop: 4 },
  badge: { marginTop: 15, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, backgroundColor: colors.border },
  badgeText: { color: colors.textSecondary, fontSize: 11, fontWeight: 'bold' },
  verifiedBadge: { backgroundColor: colors.primary + '22', borderColor: colors.primary, borderWidth: 1 },
  verifiedBadgeText: { color: colors.primary },
  section: { marginHorizontal: 20, marginTop: 20, backgroundColor: colors.surface, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { color: colors.textSecondary, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 15 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  infoText: { marginLeft: 15 },
  infoLabel: { color: colors.textSecondary, fontSize: 12 },
  infoValue: { color: colors.textPrimary, fontSize: 16, fontWeight: '600', marginTop: 2 },
  idPreview: { width: '100%', height: 200, borderRadius: 12, backgroundColor: colors.background },
  actionBtn: { padding: 14, borderRadius: 10, alignItems: 'center', marginBottom: 12 },
  actionBtnText: { fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: colors.surface, borderRadius: 20, padding: 25 },
  modalTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  otpInput: { backgroundColor: colors.background, color: colors.textPrimary, borderRadius: 10, padding: 15, fontSize: 18, borderWidth: 1, borderColor: colors.border, marginBottom: 20, textAlign: 'center', letterSpacing: 5 },
  confirmBtn: { backgroundColor: colors.primary, padding: 15, borderRadius: 10, alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  fullscreenOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  closeImageBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 25 },
  imageWrapper: { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  fullscreenImage: { width: windowWidth * 0.95, height: windowHeight * 0.75 },
  zoomControls: { flexDirection: 'row', alignItems: 'center', bottom: 50, position: 'absolute', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 30 },
  zoomBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  loadingOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  loadingBox: { backgroundColor: colors.surface, padding: 30, borderRadius: 20, alignItems: 'center', width: '80%', borderWidth: 1, borderColor: colors.border },
  loadingText: { color: colors.textPrimary, fontSize: 18, fontWeight: 'bold', marginTop: 15, textAlign: 'center' },
  loadingSubtext: { color: colors.textSecondary, fontSize: 13, marginTop: 8, textAlign: 'center' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 50 }
});
