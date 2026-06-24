import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, Image, Modal } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/useAuthStore';
import { api, setAuthToken, ROOT_URL, resolveMediaURL } from '../../services/api';
import { colors } from '../../theme/colors';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ChatFAB from '../../components/ChatFAB';

const DOC_TYPES = [
  { label: 'ID Card', value: 'id_card' },
  { label: 'Fee Receipt', value: 'fee_receipt' },
  { label: 'Library Card', value: 'library_card' },
  { label: 'Other Document', value: 'other' },
];

export default function ProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const login = useAuthStore((state) => state.login);
  const token = useAuthStore((state) => state.token);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docModalVisible, setDocModalVisible] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState('id_card');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [imageTimestamp, setImageTimestamp] = useState(new Date().getTime());

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [collegeName, setCollegeName] = useState(user?.college_name || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [year, setYear] = useState(user?.year?.toString() || '');
  const [semester, setSemester] = useState(user?.semester?.toString() || '');
  const [favSubjects, setFavSubjects] = useState(user?.favorite_subjects || '');
  const [cgpa, setCgpa] = useState(user?.cgpa?.toString() || '');
  const [rollNo, setRollNo] = useState(user?.roll_no || '');
  const [batch, setBatch] = useState(user?.batch || '');

  const handleSave = async () => {
    setSaving(true);
    try {
      if (token) setAuthToken(token);
      const res = await api.patch('/users/me', {
        full_name: fullName,
        college_name: collegeName,
        department,
        year: year ? parseInt(year) : null,
        semester: semester ? parseInt(semester) : null,
        favorite_subjects: favSubjects,
        cgpa: cgpa ? parseFloat(cgpa) : null,
        roll_no: rollNo,
        batch: batch,
      });
      if (token) login(res.data, token);
      setEditing(false);
      Alert.alert('✅ Saved', 'Profile updated successfully!');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const openDocModal = () => setDocModalVisible(true);

  const pickAndUpload = async (docType: string) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'We need access to your photos to upload documents.');
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.5,
    });
    if (!result.canceled) {
      uploadImage(result.assets[0].uri, docType);
    }
  };

  const uploadImage = async (uri: string, docType: string) => {
    setUploading(true);
    try {
      const formData = new FormData();
      const filename = uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename || '');
      const type = match ? `image/${match[1]}` : `image`;

      formData.append('file', { uri, name: filename, type } as any);
      formData.append('document_type', docType);
      
      await api.post('/users/me/upload-id', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      Alert.alert('Success', 'Document uploaded! Admin will verify soon.');
      const userRes = await api.get('/users/me');
      if (token) login(userRes.data, token);
      setDocModalVisible(false);
    } catch (e) {
      Alert.alert('Error', 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const pickAndUploadProfile = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'We need access to your photos to upload a profile image.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.5,
    });

    if (!result.canceled) {
      uploadProfileImage(result.assets[0].uri);
    }
  };

  const uploadProfileImage = async (uri: string) => {
    setUploading(true);
    try {
      const formData = new FormData();
      const filename = uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename || '');
      const type = match ? `image/${match[1]}` : `image`;

      formData.append('file', { uri, name: filename, type } as any);
      
      await api.post('/users/me/upload-profile-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      Alert.alert('Success', 'Profile image updated!');
      setImageTimestamp(new Date().getTime());
      const userRes = await api.get('/users/me');
      if (token) login(userRes.data, token);
    } catch (e) {
      Alert.alert('Error', 'Failed to upload profile image');
    } finally {
      setUploading(false);
    }
  };



  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Profile</Text>
          <TouchableOpacity
            onPress={editing ? handleSave : () => setEditing(true)}
            style={editing ? styles.saveBtn : styles.editBtn}
            disabled={saving}
          >
            {saving ? <ActivityIndicator size="small" color="#fff" /> :
              <Text style={editing ? styles.saveBtnText : styles.editBtnText}>{editing ? 'Save' : 'Edit'}</Text>
            }
          </TouchableOpacity>
        </View>

        <View style={styles.avatarBlock}>
          <TouchableOpacity 
            onPress={editing ? pickAndUploadProfile : undefined} 
            style={styles.avatar}
            disabled={!editing}
          >
            {user?.profile_image_path ? (
              <Image 
                source={{ uri: `${resolveMediaURL(user.profile_image_path)}?t=${imageTimestamp}` }} 
                style={styles.avatarImage} 
              />
            ) : (
              <Text style={styles.avatarInitial}>{(user?.full_name || 'U')[0].toUpperCase()}</Text>
            )}
            {(user?.is_identity_verified || user?.is_core_member || user?.is_admin) && (
              <View style={styles.verifiedBadge}>
                <MaterialCommunityIcons name="check-decagram" size={24} color={colors.primary} />
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.nameRow}>
            <Text style={styles.profileName}>{user?.full_name || 'Anonymous'}</Text>
          </View>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>
              {user?.is_admin ? '⚡ Admin' : user?.is_core_member ? '🌟 Core Member' : user?.verification_status === 'verified' ? '🎓 Verified Student' : '🎓 Student (Unverified)'}
            </Text>
          </View>
        </View>

        {/* Document Upload Modal */}
        <Modal visible={docModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Upload Verification Document</Text>
                <TouchableOpacity onPress={() => setDocModalVisible(false)}>
                  <MaterialCommunityIcons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.modalLabel}>Select Document Type</Text>
              <TouchableOpacity style={styles.dropdownBtn} onPress={() => setDropdownOpen(!dropdownOpen)}>
                <Text style={styles.dropdownBtnText}>{DOC_TYPES.find(d => d.value === selectedDocType)?.label}</Text>
                <MaterialCommunityIcons name={dropdownOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.primary} />
              </TouchableOpacity>
              {dropdownOpen && (
                <View style={styles.dropdownList}>
                  {DOC_TYPES.map(doc => (
                    <TouchableOpacity
                      key={doc.value}
                      style={[styles.dropdownItem, selectedDocType === doc.value && styles.dropdownItemActive]}
                      onPress={() => { setSelectedDocType(doc.value); setDropdownOpen(false); }}
                    >
                      <Text style={[styles.dropdownItemText, selectedDocType === doc.value && { color: colors.primary }]}>{doc.label}</Text>
                      {selectedDocType === doc.value && <MaterialCommunityIcons name="check" size={18} color={colors.primary} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              
              <TouchableOpacity
                style={[styles.uploadSubmitBtn, uploading && { opacity: 0.7 }]}
                onPress={() => pickAndUpload(selectedDocType)}
                disabled={uploading}
              >
                {uploading ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <MaterialCommunityIcons name="upload" size={20} color="#fff" />
                    <Text style={styles.uploadSubmitBtnText}>Choose & Upload File</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Identity Verification</Text>
          {(user?.verification_status === 'verified' || user?.is_core_member || user?.is_admin) ? (
            <View style={styles.statusRow}>
              <MaterialCommunityIcons name="shield-check" size={24} color={colors.primary} />
              <Text style={styles.statusTextVerified}>Identity Verified</Text>
            </View>
          ) : user?.verification_status === 'pending' ? (
            <View style={styles.statusRow}>
              <MaterialCommunityIcons name="clock-outline" size={24} color="#FF9800" />
              <Text style={styles.statusTextPending}>Verification Pending Approval</Text>
            </View>
          ) : (
            <View>
              {user?.verification_status === 'rejected' && (
                <Text style={{ color: '#F44336', marginBottom: 10, fontWeight: '600' }}>Your previous document was rejected. Please re-upload.</Text>
              )}
              <Text style={{ color: colors.textSecondary, marginBottom: 12, fontSize: 13 }}>Upload a document to get verified and unlock core features.</Text>
              <TouchableOpacity style={styles.uploadBtn} onPress={openDocModal} disabled={uploading}>
                <MaterialCommunityIcons name="file-upload-outline" size={20} color="#fff" />
                <Text style={styles.uploadBtnText}>Upload Verification Document</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Academic Details</Text>
          
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Roll No</Text>
            {editing ? (
              <TextInput
                style={styles.fieldInput}
                value={rollNo}
                onChangeText={setRollNo}
                placeholder="Enter your roll number"
                placeholderTextColor={colors.textSecondary}
              />
            ) : (
              <Text style={styles.fieldValue}>{rollNo || <Text style={styles.emptyVal}>Not set</Text>}</Text>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Batch</Text>
            {editing ? (
              <TextInput
                style={styles.fieldInput}
                value={batch}
                onChangeText={setBatch}
                placeholder="e.g. 2021-25"
                placeholderTextColor={colors.textSecondary}
              />
            ) : (
              <Text style={styles.fieldValue}>{batch || <Text style={styles.emptyVal}>Not set</Text>}</Text>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>College / University</Text>
            {editing ? (
              <TextInput
                style={styles.fieldInput}
                value={collegeName}
                onChangeText={setCollegeName}
                placeholder="College / University"
                placeholderTextColor={colors.textSecondary}
              />
            ) : (
              <Text style={styles.fieldValue}>{collegeName || <Text style={styles.emptyVal}>Not set</Text>}</Text>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Department</Text>
            {editing ? (
              <TextInput
                style={styles.fieldInput}
                value={department}
                onChangeText={setDepartment}
                placeholder="e.g. Computer Science"
                placeholderTextColor={colors.textSecondary}
              />
            ) : (
              <Text style={styles.fieldValue}>{department || <Text style={styles.emptyVal}>Not set</Text>}</Text>
            )}
          </View>

          <View style={styles.rowFields}>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>Year</Text>
              {editing ? (
                <TextInput style={styles.fieldInput} value={year} onChangeText={setYear} keyboardType="number-pad" placeholder="1-4" placeholderTextColor={colors.textSecondary} />
              ) : (
                <Text style={styles.fieldValue}>{year || <Text style={styles.emptyVal}>Not set</Text>}</Text>
              )}
            </View>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>Semester</Text>
              {editing ? (
                <TextInput style={styles.fieldInput} value={semester} onChangeText={setSemester} keyboardType="number-pad" placeholder="1-8" placeholderTextColor={colors.textSecondary} />
              ) : (
                <Text style={styles.fieldValue}>{semester || <Text style={styles.emptyVal}>Not set</Text>}</Text>
              )}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>CGPA / Percentage</Text>
            {editing ? (
              <TextInput
                style={styles.fieldInput}
                value={cgpa}
                onChangeText={setCgpa}
                keyboardType="numeric"
                placeholder="e.g. 8.5"
                placeholderTextColor={colors.textSecondary}
              />
            ) : (
              <Text style={styles.fieldValue}>{cgpa || <Text style={styles.emptyVal}>Not set</Text>}</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Interests</Text>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Favourite Subjects</Text>
            {editing ? (
              <TextInput
                style={styles.fieldInput}
                value={favSubjects}
                onChangeText={setFavSubjects}
                placeholder="e.g. DSA, Web Dev, AI/ML"
                placeholderTextColor={colors.textSecondary}
              />
            ) : (
              <Text style={styles.fieldValue}>{favSubjects || <Text style={styles.emptyVal}>Not set</Text>}</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Picture</Text>
          {editing ? (
            <TouchableOpacity
              style={styles.uploadBtn}
              onPress={() => pickAndUploadProfile()}
              disabled={uploading}
            >
              {uploading ? <ActivityIndicator color="#fff" /> : (
                <>
                  <MaterialCommunityIcons name="camera-plus" size={20} color="#fff" />
                  <Text style={styles.uploadBtnText}>Update Profile Image</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Enter edit mode to change your profile picture.</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Security</Text>
          <TouchableOpacity 
            style={styles.actionBtn} 
            onPress={() => navigation.navigate('ChangePassword')}
          >
            <MaterialCommunityIcons name="lock-reset" size={18} color={colors.primary} />
            <Text style={styles.actionBtnText}>Change Password</Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionBtn} 
            onPress={() => navigation.navigate('ChangeEmail')}
          >
            <MaterialCommunityIcons name="email-edit" size={18} color={colors.primary} />
            <Text style={styles.actionBtnText}>Change Email</Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {editing && (
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
      <ChatFAB />
    </SafeAreaView>
  );
}



const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 16,
    borderBottomWidth: 1, borderColor: colors.border,
  },
  backBtn: { padding: 8 },
  headerTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: 'bold' },
  editBtn: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: colors.primary },
  editBtnText: { color: colors.primary, fontWeight: '600', fontSize: 14 },
  saveBtn: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20, backgroundColor: colors.primary },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  avatarBlock: { alignItems: 'center', paddingVertical: 28 },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary + '33',
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.primary,
  },
  avatarInitial: { color: colors.primary, fontSize: 32, fontWeight: 'bold' },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  profileName: { color: colors.textPrimary, fontSize: 22, fontWeight: 'bold', marginTop: 12 },
  profileEmail: { color: colors.textSecondary, fontSize: 14, marginTop: 4 },
  verifiedBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: colors.surface, borderRadius: 10 },
  roleBadge: {
    marginTop: 10, paddingHorizontal: 14, paddingVertical: 4,
    backgroundColor: colors.primary + '20', borderRadius: 20, borderWidth: 1, borderColor: colors.primary + '44',
  },
  roleText: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  section: { marginHorizontal: 20, marginBottom: 20, backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { color: colors.textSecondary, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16 },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 4 },
  fieldValue: { color: colors.textPrimary, fontSize: 15 },
  emptyVal: { color: colors.textSecondary, fontStyle: 'italic' },
  fieldInput: {
    backgroundColor: colors.background, color: colors.textPrimary, borderRadius: 8,
    padding: 10, fontSize: 15, borderWidth: 1, borderColor: colors.border,
  },
  rowFields: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1, marginBottom: 16 },
  statusRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, padding: 12, borderRadius: 8 },
  statusTextVerified: { color: colors.primary, fontWeight: 'bold', marginLeft: 10 },
  statusTextPending: { color: '#FF9800', fontWeight: 'bold', marginLeft: 10 },
  uploadBtn: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, borderRadius: 12 },
  uploadBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, backgroundColor: colors.background, borderRadius: 10, marginBottom: 10 },
  actionBtnText: { color: colors.textPrimary, fontWeight: '600', flex: 1, marginLeft: 10 },
  cancelBtn: { marginHorizontal: 20, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  cancelText: { color: colors.textSecondary, fontWeight: '600' },
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: 'bold' },
  modalLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  dropdownBtn: { backgroundColor: colors.background, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  dropdownBtnText: { color: colors.textPrimary, fontSize: 15 },
  dropdownList: { backgroundColor: colors.background, borderRadius: 10, borderWidth: 1, borderColor: colors.border, marginBottom: 16, overflow: 'hidden' },
  dropdownItem: { padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border },
  dropdownItemActive: { backgroundColor: colors.primary + '15' },
  dropdownItemText: { color: colors.textSecondary, fontSize: 14 },
  uploadSubmitBtn: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, marginTop: 8 },
  uploadSubmitBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 10, fontSize: 15 },
});
