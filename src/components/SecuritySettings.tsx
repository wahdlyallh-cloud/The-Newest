import React from 'react';
import PasskeyAuth from './PasskeyAuth';
import { AppLanguage } from '../lib/languages';

interface SecuritySettingsProps {
  appLanguage?: AppLanguage;
  biometricCredentialId?: string;
  isAppLockEnabled?: boolean;
  appPinCode?: string;
  onUpdateSecuritySettings: (newSettings: {
    biometricCredentialId?: string;
    isBiometricEnabled?: boolean;
    isAppLockEnabled?: boolean;
    appPinCode?: string;
  }) => void;
}

export default function SecuritySettings(props: SecuritySettingsProps) {
  return <PasskeyAuth {...props} />;
}
