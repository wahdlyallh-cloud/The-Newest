import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hayatai.app',
  appName: 'حياة AI',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
