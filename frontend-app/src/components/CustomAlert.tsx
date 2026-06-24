import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAlertStore, AlertButton } from '../store/useAlertStore';

export const CustomAlert = () => {
  const { visible, title, message, buttons, hideAlert } = useAlertStore();

  if (!visible) return null;

  // Determine Icon based on keywords in title or message
  let iconName: any = 'information-outline';
  let iconColor = colors.primary;
  const lowerTitle = title?.toLowerCase() || '';
  const lowerMessage = message?.toLowerCase() || '';

  if (
    lowerTitle.includes('error') ||
    lowerTitle.includes('fail') ||
    lowerTitle.includes('invalid') ||
    lowerTitle.includes('locked') ||
    lowerMessage.includes('failed') ||
    lowerMessage.includes('error') ||
    lowerTitle.includes('incomplete') ||
    lowerTitle.includes('missing')
  ) {
    iconName = 'alert-circle-outline';
    iconColor = colors.error;
  } else if (
    lowerTitle.includes('success') ||
    lowerTitle.includes('saved') ||
    lowerTitle.includes('verified') ||
    lowerTitle.includes('done') ||
    lowerTitle.includes('thank you') ||
    lowerMessage.includes('successfully') ||
    lowerTitle.includes('submitted') ||
    lowerTitle.includes('sent')
  ) {
    iconName = 'check-circle-outline';
    iconColor = colors.success;
  } else if (
    lowerTitle.includes('warning') ||
    lowerTitle.includes('sure') ||
    lowerTitle.includes('delete') ||
    lowerTitle.includes('permission') ||
    lowerMessage.includes('are you sure')
  ) {
    iconName = 'alert-outline';
    iconColor = colors.warning;
  }

  const handleButtonPress = (btn: AlertButton) => {
    hideAlert();
    if (btn.onPress) {
      // Small timeout to allow Modal to hide before execution to avoid interaction locks
      setTimeout(() => {
        btn.onPress?.();
      }, 100);
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={hideAlert}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <MaterialCommunityIcons name={iconName} size={42} color={iconColor} />
            <Text style={styles.title}>{title}</Text>
          </View>

          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={styles.buttonContainer}>
            {buttons.map((btn, index) => {
              const isCancel = btn.style === 'cancel' || btn.text.toLowerCase() === 'cancel' || btn.text.toLowerCase() === 'no';
              const isDestructive = btn.style === 'destructive';
              
              let buttonStyle = styles.buttonPrimary;
              let textStyle = styles.buttonTextPrimary;

              if (isCancel) {
                buttonStyle = styles.buttonSecondary;
                textStyle = styles.buttonTextSecondary;
              } else if (isDestructive) {
                buttonStyle = styles.buttonDestructive;
                textStyle = styles.buttonTextDestructive;
              }

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    buttonStyle,
                    buttons.length > 2 ? styles.buttonStack : styles.buttonSideBySide,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => handleButtonPress(btn)}
                >
                  <Text style={textStyle}>{btn.text}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const { width } = Dimensions.get('window');
const maxCardWidth = Math.min(width * 0.85, 340);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: maxCardWidth,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  buttonSideBySide: {
    flex: 1,
    minWidth: 100,
  },
  buttonStack: {
    width: '100%',
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonTextPrimary: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '700',
  },
  buttonSecondary: {
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonTextSecondary: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDestructive: {
    backgroundColor: colors.error,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonTextDestructive: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
});
