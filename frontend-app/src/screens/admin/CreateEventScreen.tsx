import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Platform, Switch
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { api } from '../../services/api';
import { colors } from '../../theme/colors';
import { useAuthStore } from '../../store/useAuthStore';

export default function CreateEventScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);

  if (!user || (!user.is_admin && !user.is_core_member)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <Text style={{ color: colors.error, fontSize: 16, fontWeight: 'bold' }}>Access Denied</Text>
      </View>
    );
  }

  const eventId = route?.params?.eventId;
  const isEdit = !!eventId;
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [registrationLink, setRegistrationLink] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [isPublished, setIsPublished] = useState(false);
  
  // Only used for iOS
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  
  const [loading, setLoading] = useState(false);

  // Fetch event detail if editing
  useEffect(() => {
    if (eventId) {
      setLoading(true);
      api.get('/events/')
        .then((res) => {
          const ev = res.data.find((e: any) => e.id === eventId);
          if (ev) {
            setName(ev.name);
            setDescription(ev.description || '');
            setRegistrationLink(ev.registration_link || '');
            setStartDate(new Date(ev.start_date));
            setEndDate(new Date(ev.end_date));
            setIsPublished(ev.is_published);
          }
        })
        .catch((err) => {
          Alert.alert('Error', 'Failed to fetch event details.');
        })
        .finally(() => setLoading(false));
    }
  }, [eventId]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Missing Fields', 'Event name is required.');
      return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        await api.patch(`/events/${eventId}`, {
          name: name.trim(),
          description: description.trim(),
          registration_link: registrationLink.trim() || null,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          is_published: isPublished,
          is_active: true,
        });
        Alert.alert('✅ Updated!', 'Event has been updated successfully.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        await api.post('/events/', {
          name: name.trim(),
          description: description.trim(),
          registration_link: registrationLink.trim() || null,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          is_published: isPublished,
          is_active: true,
        });
        Alert.alert('✅ Created!', 'Event has been created successfully.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to save event.');
    } finally {
      setLoading(false);
    }
  };

  // Android Pickers
  const showAndroidPicker = (currentDate: Date, setter: (d: Date) => void) => {
    DateTimePickerAndroid.open({
      value: currentDate,
      onChange: (event, selectedDate) => {
        if (selectedDate) setter(selectedDate);
      },
      mode: 'date',
      is24Hour: true,
    });
  };

  const showAndroidTimePicker = (currentDate: Date, setter: (d: Date) => void) => {
    DateTimePickerAndroid.open({
      value: currentDate,
      onChange: (event, selectedDate) => {
        if (selectedDate) setter(selectedDate);
      },
      mode: 'time',
      is24Hour: true,
    });
  };

  const onIosStartChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) setStartDate(selectedDate);
  };

  const onIosEndChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) setEndDate(selectedDate);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEdit ? 'Edit Event' : 'Create Event'}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.form}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, backgroundColor: colors.surface, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>Directly Publish (Notify all users)</Text>
            <Switch 
              value={isPublished} 
              onValueChange={setIsPublished} 
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          <Text style={styles.label}>Event Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Hackathon 2025"
            placeholderTextColor={colors.textSecondary}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={description}
            onChangeText={setDescription}
            placeholder="Tell participants about this event..."
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <Text style={styles.label}>Registration Link (Optional)</Text>
          <TextInput
            style={styles.input}
            value={registrationLink}
            onChangeText={setRegistrationLink}
            placeholder="https://forms.gle/..."
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            keyboardType="url"
          />

          <Text style={styles.label}>Start Date & Time *</Text>
          <TouchableOpacity 
            style={styles.dateSelector} 
            onPress={() => Platform.OS === 'android' ? showAndroidPicker(startDate, setStartDate) : setShowStartPicker(!showStartPicker)}
          >
            <Text style={styles.dateText}>{startDate.toLocaleString()}</Text>
          </TouchableOpacity>
          {Platform.OS === 'ios' && showStartPicker && (
            <DateTimePicker
              value={startDate}
              mode="datetime"
              display="spinner"
              onChange={(e, d) => d && setStartDate(d)}
            />
          )}

          <Text style={styles.label}>End Date & Time *</Text>
          <TouchableOpacity 
            style={styles.dateSelector} 
            onPress={() => Platform.OS === 'android' ? showAndroidPicker(endDate, setEndDate) : setShowEndPicker(!showEndPicker)}
          >
            <Text style={styles.dateText}>{endDate.toLocaleString()}</Text>
          </TouchableOpacity>
          {Platform.OS === 'ios' && showEndPicker && (
            <DateTimePicker
              value={endDate}
              mode="datetime"
              display="spinner"
              onChange={(e, d) => d && setEndDate(d)}
            />
          )}

          <TouchableOpacity style={styles.submitBtn} onPress={handleSave} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.submitText}>{isEdit ? 'Update Event' : '🚀 Create Event'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  backIcon: { color: colors.primary, fontSize: 22 },
  headerTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: 'bold' },
  form: { padding: 20 },
  label: { color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 12 },
  input: {
    backgroundColor: colors.surface, color: colors.textPrimary, borderRadius: 10,
    padding: 14, fontSize: 15, borderWidth: 1, borderColor: colors.border,
  },
  multiline: { height: 100, paddingTop: 14 },
  dateSelector: {
    backgroundColor: colors.surface, borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  dateText: { color: colors.textPrimary, fontSize: 15 },
  submitBtn: {
    marginTop: 32, backgroundColor: colors.primary, borderRadius: 14,
    padding: 16, alignItems: 'center',
  },
  submitText: { color: '#0E0A12', fontWeight: 'bold', fontSize: 17 },
});
