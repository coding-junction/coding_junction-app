import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { colors } from '../../theme/colors';
import { useAuthStore } from '../../store/useAuthStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function AdminUsersScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const currentUser = useAuthStore((state) => state.user);

  if (!currentUser || !currentUser.is_admin) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <Text style={{ color: colors.error, fontSize: 16, fontWeight: 'bold' }}>Access Denied</Text>
      </View>
    );
  }

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users/');
      setUsers(response.data);
    } catch (error) {
      console.log('Error fetching users', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const renderItem = ({ item }: any) => {
    let roleText = 'Student (Unverified)';
    if (item.is_admin) {
      roleText = '⚡ Admin';
    } else if (item.is_core_member) {
      roleText = '🌟 Core Member';
    } else if (item.verification_status === 'verified') {
      roleText = '🎓 Verified Student';
    }

    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => navigation.navigate('AdminUserDetail', { userId: item.id })}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.full_name || 'Anonymous'}</Text>
          <Text style={styles.email}>{item.email}</Text>
          <Text style={styles.role}>{roleText}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textSecondary} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <Text style={styles.header}>Manage Users</Text>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchUsers} tintColor={colors.primary} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  header: { fontSize: 24, fontWeight: 'bold', color: colors.primary, marginBottom: 16 },
  card: { backgroundColor: colors.surface, padding: 16, borderRadius: 8, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary },
  email: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  role: { fontSize: 12, color: colors.primary, marginTop: 4, fontWeight: 'bold' },
  actionBtn: { backgroundColor: colors.background, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4, borderWidth: 1, borderColor: colors.primary },
  actionText: { color: colors.primary, fontWeight: 'bold' },
  disabledBtn: { borderColor: colors.textSecondary, opacity: 0.5 },
  disabledText: { color: colors.textSecondary },
});
