import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, FlatList,
  ActivityIndicator, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { chatWithAI } from '../../services/api';

const logo = require('../../../assets/logo.png');

type Message = { id: string; text: string; isUser: boolean };

const INITIAL: Message = {
  id: '0',
  text: "Hi! I'm your CJ AI assistant ⚡\n\nAsk me anything about IT, programming, or Coding Junction events.",
  isUser: false,
};

export default function ChatScreen({ navigation }: any) {
  const [messages, setMessages] = useState<Message[]>([INITIAL]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || thinking) return;
    const userMsg: Message = { id: Date.now().toString(), text, isUser: true };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setThinking(true);
    try {
      const data = await chatWithAI(text);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: data.reply || 'Sorry, I could not process that.',
        isUser: false,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: '⚠️ Could not reach the AI engine. Please ensure the server is running.',
        isUser: false,
      }]);
    } finally {
      setThinking(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[styles.bubble, item.isUser ? styles.userBubble : styles.aiBubble]}>
      {!item.isUser && (
        <Image source={logo} style={styles.aiAvatar} resizeMode="contain" />
      )}
      <View style={[styles.bubbleContent, item.isUser ? styles.userContent : styles.aiContent]}>
        <Text style={[styles.msgText, item.isUser && styles.userMsgText]}>{item.text}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>CJ AI Assistant</Text>
          <View style={styles.onlineDot} />
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 100}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={i => i.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.msgList}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />

        {thinking && (
          <View style={styles.typingIndicator}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.typingText}>CJ AI is thinking...</Text>
          </View>
        )}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={input}
            onChangeText={setInput}
            placeholder="Ask about IT or Coding Junction..."
            placeholderTextColor={colors.textSecondary}
            multiline
            onSubmitEditing={send}
          />
          <TouchableOpacity style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]} onPress={send} disabled={!input.trim() || thinking}>
            <Text style={styles.sendIcon}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 14, borderBottomWidth: 1, borderColor: colors.border,
  },
  backBtn: { padding: 8 },
  backIcon: { color: colors.primary, fontSize: 22 },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 12 },
  headerTitle: { color: colors.textPrimary, fontWeight: 'bold', fontSize: 17 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success, marginLeft: 8 },
  msgList: { padding: 16, gap: 12 },
  bubble: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 4 },
  userBubble: { justifyContent: 'flex-end' },
  aiBubble: { justifyContent: 'flex-start' },
  aiAvatar: { width: 28, height: 28, tintColor: colors.primary, marginRight: 8, marginBottom: 4 },
  bubbleContent: { maxWidth: '80%', padding: 12, borderRadius: 16 },
  aiContent: { backgroundColor: colors.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
  userContent: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  msgText: { color: colors.textPrimary, fontSize: 15, lineHeight: 22 },
  userMsgText: { color: '#0E0A12' },
  typingIndicator: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 8, gap: 8,
  },
  typingText: { color: colors.textSecondary, fontSize: 13 },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 10,
    borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.background,
  },
  textInput: {
    flex: 1, backgroundColor: colors.surface, color: colors.textPrimary,
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, maxHeight: 100, borderWidth: 1, borderColor: colors.border,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginLeft: 10,
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendIcon: { color: '#0E0A12', fontSize: 18, fontWeight: 'bold' },
});
