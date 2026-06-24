import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';
import { colors } from '../theme/colors';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import OtpVerificationScreen from '../screens/auth/OtpVerificationScreen';

// Admin Screens
import AdminDashboard from '../screens/admin/AdminDashboard';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';
import AdminEventsScreen from '../screens/admin/AdminEventsScreen';
import CreateEventScreen from '../screens/admin/CreateEventScreen';
import AdminVerificationScreen from '../screens/admin/AdminVerificationScreen';
import AdminQuizScreen from '../screens/admin/AdminQuizScreen';
import AdminUserDetailScreen from '../screens/admin/AdminUserDetailScreen';
import CoreDashboard from '../screens/admin/CoreDashboard';
import QuizResponsesScreen from '../screens/admin/QuizResponsesScreen';

// User Screens
import UserDashboard from '../screens/user/UserDashboard';
import EventsListScreen from '../screens/user/EventsListScreen';
import QuizListScreen from '../screens/user/QuizListScreen';
import ProfileScreen from '../screens/user/ProfileScreen';
import ChangePasswordScreen from '../screens/user/ChangePasswordScreen';
import ChangeEmailScreen from '../screens/user/ChangeEmailScreen';

// Shared Screens
import ChatScreen from '../screens/chat/ChatScreen';
import ActiveTestScreen from '../screens/test/ActiveTestScreen';
import QuizDetailScreen from '../screens/user/QuizDetailScreen';
import PollDetailScreen from '../screens/user/PollDetailScreen';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  OtpVerification: { email: string };
  AdminDashboard: undefined;
  AdminUsers: undefined;
  AdminEvents: undefined;
  CreateEvent: undefined;
  AdminVerification: undefined;
  AdminQuiz: undefined;
  AdminUserDetail: { userId: string };
  CoreDashboard: undefined;
  Main: undefined; // The User Tabs
  Chat: undefined;
  ActiveTest: undefined;
  Profile: undefined;
  ChangePassword: undefined;
  ChangeEmail: undefined;
  QuizDetail: { quizId: string };
  PollDetail: { pollId: string };
  QuizResponses: { quizId: string; quizTitle: string };
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function UserTabs() {
  const user = useAuthStore((state) => state.user);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          height: 65,
          paddingBottom: 10,
          paddingTop: 5,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarIcon: ({ color, size }) => {
          let iconName: any;
          if (route.name === 'Dashboard') iconName = 'home-variant';
          else if (route.name === 'EventsTab') iconName = 'calendar-month';
          else if (route.name === 'QuizTab') iconName = 'brain';
          else if (route.name === 'AdminHub') iconName = 'crown';
          else if (route.name === 'CoreHub') iconName = 'star-circle';
          else if (route.name === 'ProfileTab') iconName = 'account-circle';
          return <MaterialCommunityIcons name={iconName} size={size + 4} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={UserDashboard} options={{ title: 'Home' }} />
      <Tab.Screen name="EventsTab" component={EventsListScreen} options={{ title: 'Events' }} />
      <Tab.Screen name="QuizTab" component={QuizListScreen} options={{ title: 'Quiz' }} />
      {user?.is_admin && (
        <Tab.Screen name="AdminHub" component={AdminDashboard} options={{ title: 'Admin Hub' }} />
      )}
      {user?.is_core_member && (
        <Tab.Screen name="CoreHub" component={CoreDashboard} options={{ title: 'Core Hub' }} />
      )}
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

import { useEffect } from 'react';
import { api } from '../services/api';

export const AppNavigator = () => {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const login = useAuthStore((state) => state.login);

  useEffect(() => {
    if (token) {
      api.get('/users/me')
        .then((res) => {
          if (res.data) {
            login(res.data, token);
          }
        })
        .catch((err) => {
          console.log('Failed to auto-refresh user data', err);
        });
    }
  }, [token]);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <Stack.Screen name="Main" component={UserTabs} />
          <Stack.Screen name="AdminUsers" component={AdminUsersScreen} />
          <Stack.Screen name="AdminEvents" component={AdminEventsScreen} />
          <Stack.Screen name="CreateEvent" component={CreateEventScreen} />
          <Stack.Screen name="AdminVerification" component={AdminVerificationScreen} />
          <Stack.Screen name="AdminQuiz" component={AdminQuizScreen} />
          <Stack.Screen name="AdminUserDetail" component={AdminUserDetailScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="ActiveTest" component={ActiveTestScreen} />
          <Stack.Screen name="QuizDetail" component={QuizDetailScreen} />
          <Stack.Screen name="PollDetail" component={PollDetailScreen} />
          <Stack.Screen name="QuizResponses" component={QuizResponsesScreen} />
          <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
          <Stack.Screen name="ChangeEmail" component={ChangeEmailScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};
