import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Image,
  ActivityIndicator, Alert, Modal, ScrollView, Dimensions
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, ROOT_URL, resolveMediaURL } from '../../services/api';
import { colors } from '../../theme/colors';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAuthStore } from '../../store/useAuthStore';

type VerifyStep = 'details' | 'document' | 'action';

export default function AdminVerificationScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);

  if (!user || !user.is_admin) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <Text style={{ color: colors.error, fontSize: 16, fontWeight: 'bold' }}>Access Denied</Text>
      </View>
    );
  }

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Multi-step verification modal state
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [step, setStep] = useState<VerifyStep>('details');
  const [processing, setProcessing] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [scale, setScale] = useState(1);

  useEffect(() => { fetchPending(); }, []);

  const fetchPending = async () => {
    try {
      const res = await api.get('/users/pending-verification');
      setUsers(res.data);
    } catch (e) {
      console.log('Error fetching pending users', e);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (user: any) => {
    setSelectedUser(user);
    setStep('details');
  };

  const closeModal = () => setSelectedUser(null);

  const handleAction = async (action: 'approve' | 'reject', role: 'student' | 'core_member' | 'admin' = 'student') => {
    if (!selectedUser) return;
    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append('action', action);
      formData.append('role', role);
      await api.post(`/users/${selectedUser.id}/verify`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      Alert.alert('Done', `User ${action === 'approve' ? 'verified' : 'rejected'} successfully!`);
      closeModal();
      fetchPending();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || `Failed to ${action} user`);
    } finally {
      setProcessing(false);
    }
  };

  const InfoRow = ({ icon, label, value }: any) => (
    <View style={styles.infoRow}>
      <MaterialCommunityIcons name={icon} size={18} color={colors.primary} style={styles.infoIcon} />
      <View>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || 'Not provided'}</Text>
      </View>
    </View>
  );

  const renderItem = ({ item }: any) => (
    <TouchableOpacity style={styles.userCard} onPress={() => openModal(item)}>
      <View style={styles.userAvatarCircle}>
        <Text style={styles.userAvatarText}>{(item.full_name || 'U')[0].toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.userName}>{item.full_name}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
        <Text style={styles.userMeta}>{item.college_name || 'Unknown College'}</Text>
        <View style={styles.docTag}>
          <MaterialCommunityIcons name="file-document-outline" size={12} color="#FF9800" />
          <Text style={styles.docTagText}>
            {item.verification_document_type === 'fee_receipt' ? 'Fee Receipt' :
             item.verification_document_type === 'library_card' ? 'Library Card' :
             item.verification_document_type === 'other' ? 'Other' : 'ID Card'}
          </Text>
        </View>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  // ─── MODAL: Details Step ────────────────────────────────────────────────────
  const renderStep = () => {
    if (!selectedUser) return null;

    if (step === 'details') {
      return (
        <ScrollView>
          <Text style={styles.stepTitle}>Step 1 of 3 — Student Details</Text>
          <View style={styles.stepAvatarBlock}>
            <View style={styles.stepAvatar}>
              <Text style={styles.stepAvatarText}>{(selectedUser.full_name || 'U')[0].toUpperCase()}</Text>
            </View>
            <Text style={styles.stepName}>{selectedUser.full_name}</Text>
            <Text style={styles.stepEmail}>{selectedUser.email}</Text>
          </View>

          <InfoRow icon="card-account-details-outline" label="Roll Number" value={selectedUser.roll_no} />
          <InfoRow icon="account-group-outline" label="Batch" value={selectedUser.batch} />
          <InfoRow icon="school-outline" label="College / University" value={selectedUser.college_name} />
          <InfoRow icon="office-building" label="Department" value={selectedUser.department} />
          <InfoRow icon="calendar-clock" label="Year / Semester" value={`${selectedUser.year || '-'} / ${selectedUser.semester || '-'}`} />
          {selectedUser.cgpa && <InfoRow icon="chart-bar" label="CGPA" value={selectedUser.cgpa?.toString()} />}
          {selectedUser.favorite_subjects && <InfoRow icon="star-outline" label="Favourite Subjects" value={selectedUser.favorite_subjects} />}

          <TouchableOpacity style={styles.nextBtn} onPress={() => setStep('document')}>
            <Text style={styles.nextBtnText}>View Document →</Text>
          </TouchableOpacity>
        </ScrollView>
      );
    }

    if (step === 'document') {
      const docLabel = selectedUser.verification_document_type === 'fee_receipt' ? 'Fee Receipt' :
                       selectedUser.verification_document_type === 'library_card' ? 'Library Card' :
                       selectedUser.verification_document_type === 'other' ? 'Other Document' : 'ID Card';
      return (
        <ScrollView>
          <Text style={styles.stepTitle}>Step 2 of 3 — Uploaded Document</Text>
          <Text style={styles.stepDocType}>📄 Document Type: <Text style={{ color: colors.primary }}>{docLabel}</Text></Text>

          {selectedUser.id_card_path ? (
            <TouchableOpacity 
              activeOpacity={0.9} 
              onPress={() => { setScale(1); setImageModalVisible(true); }}
            >
              <Image
                source={{ uri: resolveMediaURL(selectedUser.id_card_path) || undefined }}
                style={styles.docPreview}
                resizeMode="contain"
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8 }}>
                <MaterialCommunityIcons name="magnify-plus-outline" size={16} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: 12, marginLeft: 5, fontWeight: '600' }}>Tap to inspect & zoom</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.noDocBox}>
              <MaterialCommunityIcons name="file-remove-outline" size={48} color={colors.border} />
              <Text style={{ color: colors.textSecondary, marginTop: 10 }}>No document uploaded</Text>
            </View>
          )}

          <View style={styles.stepNavRow}>
            <TouchableOpacity style={styles.backBtn2} onPress={() => setStep('details')}>
              <Text style={styles.backBtn2Text}>← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.nextBtn2} onPress={() => setStep('action')}>
              <Text style={styles.nextBtnText}>Verify →</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      );
    }

    if (step === 'action') {
      return (
        <ScrollView>
          <Text style={styles.stepTitle}>Step 3 of 3 — Choose Verification</Text>
          <Text style={styles.stepSubtitle}>Select how you want to verify <Text style={{ color: colors.primary }}>{selectedUser.full_name}</Text>:</Text>

          <TouchableOpacity
            style={[styles.actionCard, { borderColor: colors.primary }]}
            onPress={() => handleAction('approve', 'student')}
            disabled={processing}
          >
            <MaterialCommunityIcons name="shield-check" size={28} color={colors.primary} />
            <View style={{ marginLeft: 14, flex: 1 }}>
              <Text style={[styles.actionCardTitle, { color: colors.primary }]}>Approve as Verified Student</Text>
              <Text style={styles.actionCardDesc}>Grants verified badge. Student can access standard features.</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { borderColor: '#FF9800' }]}
            onPress={() => handleAction('approve', 'core_member')}
            disabled={processing}
          >
            <MaterialCommunityIcons name="star-circle" size={28} color="#FF9800" />
            <View style={{ marginLeft: 14, flex: 1 }}>
              <Text style={[styles.actionCardTitle, { color: '#FF9800' }]}>Approve & Promote to Core Member</Text>
              <Text style={styles.actionCardDesc}>Grants Core Member role. Can create quizzes, polls, and events.</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { borderColor: '#E91E63' }]}
            onPress={() => {
              Alert.alert(
                '⚠️ Critical Action Warning',
                `Are you sure you want to approve and promote ${selectedUser.full_name} to Administrator? This will grant them full database access, system controls, and settings management permissions.`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Confirm & Promote', style: 'destructive', onPress: () => handleAction('approve', 'admin') }
                ]
              );
            }}
            disabled={processing}
          >
            <MaterialCommunityIcons name="security" size={28} color="#E91E63" />
            <View style={{ marginLeft: 14, flex: 1 }}>
              <Text style={[styles.actionCardTitle, { color: '#E91E63' }]}>Approve & Promote to Admin</Text>
              <Text style={styles.actionCardDesc}>Grants Admin role. Full permissions to manage settings, members, and data.</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { borderColor: '#F44336' }]}
            onPress={() => handleAction('reject')}
            disabled={processing}
          >
            <MaterialCommunityIcons name="close-circle" size={28} color="#F44336" />
            <View style={{ marginLeft: 14, flex: 1 }}>
              <Text style={[styles.actionCardTitle, { color: '#F44336' }]}>Reject Document</Text>
              <Text style={styles.actionCardDesc}>Rejects the upload. Student will be asked to re-upload.</Text>
            </View>
          </TouchableOpacity>

          {processing && <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />}

          <TouchableOpacity style={styles.backBtn2} onPress={() => setStep('document')}>
            <Text style={styles.backBtn2Text}>← Back to Document</Text>
          </TouchableOpacity>
        </ScrollView>
      );
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pending Verifications</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{users.length}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <MaterialCommunityIcons name="shield-check-outline" size={60} color={colors.border} />
              <Text style={styles.emptyText}>No pending verifications</Text>
            </View>
          }
        />
      )}

      {/* Multi-step Verification Modal */}
      <Modal visible={!!selectedUser} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalTopBar}>
              <View style={styles.stepIndicator}>
                {(['details', 'document', 'action'] as VerifyStep[]).map((s, idx) => (
                  <View key={s} style={[styles.stepDot, step === s && styles.stepDotActive]} />
                ))}
              </View>
              <TouchableOpacity onPress={closeModal}>
                <MaterialCommunityIcons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            {renderStep()}
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
            {selectedUser?.id_card_path && (
              <Image 
                source={{ uri: resolveMediaURL(selectedUser.id_card_path) || undefined }} 
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
    </SafeAreaView>
  );
}

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 15, borderBottomWidth: 1, borderColor: colors.border,
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: 'bold', flex: 1 },
  countBadge: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 2 },
  countText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  list: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 },
  emptyText: { color: colors.textSecondary, fontSize: 16, marginTop: 12 },

  // List card
  userCard: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center',
  },
  userAvatarCircle: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary + '20',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.primary, marginRight: 14,
  },
  userAvatarText: { color: colors.primary, fontSize: 20, fontWeight: 'bold' },
  userName: { color: colors.textPrimary, fontSize: 16, fontWeight: 'bold' },
  userEmail: { color: colors.textSecondary, fontSize: 13, marginTop: 1 },
  userMeta: { color: colors.primary, fontSize: 12, marginTop: 3 },
  docTag: {
    flexDirection: 'row', alignItems: 'center', marginTop: 5,
    backgroundColor: '#FF980015', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start',
  },
  docTagText: { color: '#FF9800', fontSize: 11, fontWeight: '700', marginLeft: 4 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, maxHeight: '90%',
  },
  modalTopBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  stepIndicator: { flexDirection: 'row', gap: 8 },
  stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.border },
  stepDotActive: { backgroundColor: colors.primary },

  // Steps
  stepTitle: { color: colors.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 16 },
  stepAvatarBlock: { alignItems: 'center', marginBottom: 20 },
  stepAvatar: {
    width: 70, height: 70, borderRadius: 35, backgroundColor: colors.primary + '20',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.primary,
  },
  stepAvatarText: { color: colors.primary, fontSize: 28, fontWeight: 'bold' },
  stepName: { color: colors.textPrimary, fontSize: 20, fontWeight: 'bold', marginTop: 10 },
  stepEmail: { color: colors.textSecondary, fontSize: 14, marginTop: 2 },
  stepDocType: { color: colors.textSecondary, fontSize: 14, marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  infoIcon: { marginRight: 12, marginTop: 2 },
  infoLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '600' },
  infoValue: { color: colors.textPrimary, fontSize: 15, fontWeight: '600', marginTop: 2 },

  nextBtn: { backgroundColor: colors.primary, padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  nextBtn2: { flex: 1, backgroundColor: colors.primary, padding: 14, borderRadius: 12, alignItems: 'center' },
  nextBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  backBtn2: { padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border, marginTop: 12 },
  backBtn2Text: { color: colors.textSecondary, fontWeight: '600' },
  stepNavRow: { flexDirection: 'row', gap: 10, marginTop: 20 },

  docPreview: { width: '100%', height: 260, borderRadius: 16, backgroundColor: colors.background, marginBottom: 10 },
  fullscreenOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  closeImageBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 25 },
  imageWrapper: { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  fullscreenImage: { width: windowWidth * 0.95, height: windowHeight * 0.75 },
  zoomControls: { flexDirection: 'row', alignItems: 'center', bottom: 50, position: 'absolute', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 30 },
  zoomBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  noDocBox: {
    width: '100%', height: 160, borderRadius: 16, backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border,
  },

  // Action cards
  stepSubtitle: { color: colors.textSecondary, fontSize: 14, marginBottom: 20, lineHeight: 20 },
  actionCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 14,
    borderWidth: 1.5, backgroundColor: colors.background, marginBottom: 14,
  },
  actionCardTitle: { fontSize: 15, fontWeight: 'bold' },
  actionCardDesc: { color: colors.textSecondary, fontSize: 12, marginTop: 4, lineHeight: 18 },
});
