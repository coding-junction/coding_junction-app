import { Alert } from 'react-native';
import { useAlertStore } from '../store/useAlertStore';

Alert.alert = (title, message, buttons, options) => {
  useAlertStore.getState().showAlert(title, message || '', buttons || []);
};
