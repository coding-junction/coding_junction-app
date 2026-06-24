import { LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { RootStackParamList } from './AppNavigator';

const prefix = Linking.createURL('/');

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [prefix, 'codingjunction://'],
  config: {
    screens: {
      Login: 'login',
      Main: {
        path: 'app',
        screens: {
          HomeTab: 'dashboard',
          EventsTab: 'events',
          QuizTab: 'quizzes',
          ProfileTab: 'profile',
        },
      },
      AdminDashboard: 'admin',
      ActiveTest: 'test/:id',
      Chat: 'chat',
    },
  },
};
