import { registerPlugin, Capacitor, PluginListenerHandle } from '@capacitor/core';

export interface AppVersionInfo {
  versionCode: number;
  versionName: string;
}

export interface AppUpdaterPluginInterface {
  getAppVersion(): Promise<AppVersionInfo>;
  downloadAndInstall(options: { url: string }): Promise<{ status: 'installing' | 'needs_permission' }>;
  addListener(
    eventName: 'downloadProgress',
    listenerFunc: (info: { progress: number; downloadedBytes: number; totalBytes: number }) => void
  ): Promise<PluginListenerHandle>;
}

export const NativeAppUpdater = registerPlugin<AppUpdaterPluginInterface>('AppUpdater');

export interface AppUpdateCheckResult {
  hasUpdate: boolean;
  installedVersionCode: number;
  installedVersionName: string;
  remoteVersionCode: number | null;
  remoteVersionName: string | null;
  apkUrl: string | null;
  releaseNotes: string | null;
  isOffline?: boolean;
}

export async function getInstalledAppVersion(): Promise<AppVersionInfo> {
  const metaEnv = (import.meta as any)?.env || {};
  const defaultVersionCode = Number(metaEnv.VITE_APP_VERSION_CODE) || 100;
  const defaultVersionName = (metaEnv.VITE_APP_VERSION_NAME as string) || '1.0.0';

  if (!Capacitor.isNativePlatform()) {
    return {
      versionCode: defaultVersionCode,
      versionName: defaultVersionName
    };
  }

  try {
    const versionInfo = await NativeAppUpdater.getAppVersion();
    if (versionInfo && typeof versionInfo.versionCode === 'number') {
      return {
        versionCode: versionInfo.versionCode,
        versionName: versionInfo.versionName || defaultVersionName
      };
    }
  } catch (err) {
    console.warn('[AppUpdater] Failed to read native version code, falling back to build env:', err);
  }

  return {
    versionCode: defaultVersionCode,
    versionName: defaultVersionName
  };
}

export async function checkForAppUpdate(_force = false): Promise<AppUpdateCheckResult> {
  const versionInfo = await getInstalledAppVersion();
  const installedVersionCode = versionInfo.versionCode;
  const installedVersionName = versionInfo.versionName;

  // Check network connectivity first
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      hasUpdate: false,
      installedVersionCode,
      installedVersionName,
      remoteVersionCode: null,
      remoteVersionName: null,
      apkUrl: null,
      releaseNotes: null,
      isOffline: true
    };
  }

  try {
    const response = await fetch(
      'https://api.github.com/repos/wahdlyallh-cloud/The-Newest/releases/latest',
      {
        cache: 'no-store',
        headers: {
          Accept: 'application/vnd.github.v3+json'
        }
      }
    );

    if (!response.ok) {
      return {
        hasUpdate: false,
        installedVersionCode,
        installedVersionName,
        remoteVersionCode: null,
        remoteVersionName: null,
        apkUrl: null,
        releaseNotes: null,
        isOffline: false
      };
    }

    const releaseData = await response.json();
    const releaseBody: string = releaseData?.body || '';
    const tagName: string = releaseData?.tag_name || '';

    // 1. Strict parsing of versionCode from release body (e.g. "versionCode:105")
    const codeMatch = releaseBody.match(/versionCode\s*:\s*(\d+)/i);
    let remoteVersionCode: number | null = null;
    if (codeMatch) {
      remoteVersionCode = parseInt(codeMatch[1], 10);
    } else {
      // Fallback derivation: 100 + N from v1.0.N
      const tagMatch = tagName.match(/v?1\.0\.(\d+)/i);
      if (tagMatch) {
        remoteVersionCode = 100 + parseInt(tagMatch[1], 10);
      }
    }

    const remoteVersionName = releaseData?.name || tagName || (remoteVersionCode ? `v${remoteVersionCode}` : null);

    // 2. Extract APK asset download URL
    const assets: any[] = Array.isArray(releaseData?.assets) ? releaseData.assets : [];
    const apkAsset = assets.find(
      (a) => typeof a.name === 'string' && a.name.toLowerCase().endsWith('.apk')
    );
    const apkUrl: string | null = apkAsset?.browser_download_url || releaseData?.html_url || null;

    // 3. Compare strictly newer than real installed native versionCode
    const hasUpdate =
      Number.isFinite(remoteVersionCode) &&
      (remoteVersionCode as number) > installedVersionCode &&
      Boolean(apkUrl);

    return {
      hasUpdate,
      installedVersionCode,
      installedVersionName,
      remoteVersionCode,
      remoteVersionName,
      apkUrl,
      releaseNotes: releaseBody,
      isOffline: false
    };
  } catch (e) {
    console.warn('[AppUpdater] Failed to check for updates (silent):', e);
    return {
      hasUpdate: false,
      installedVersionCode,
      installedVersionName,
      remoteVersionCode: null,
      remoteVersionName: null,
      apkUrl: null,
      releaseNotes: null,
      isOffline: typeof navigator !== 'undefined' && !navigator.onLine
    };
  }
}

export async function installLatestUpdate(
  apkUrl: string,
  onProgress?: (progress: number, downloadedBytes: number, totalBytes: number) => void
): Promise<{ status: 'installing' | 'needs_permission' | 'error'; message?: string }> {
  if (!Capacitor.isNativePlatform()) {
    return { status: 'error', message: 'In-app update is only supported on Android devices.' };
  }

  let progressListener: PluginListenerHandle | null = null;

  try {
    if (onProgress) {
      progressListener = await NativeAppUpdater.addListener('downloadProgress', (info) => {
        onProgress(info.progress, info.downloadedBytes, info.totalBytes);
      });
    }

    const res = await NativeAppUpdater.downloadAndInstall({ url: apkUrl });
    return { status: res.status };
  } catch (err: any) {
    console.error('[AppUpdater] Install error:', err);
    return { status: 'error', message: err?.message || 'Download failed' };
  } finally {
    if (progressListener) {
      try {
        await progressListener.remove();
      } catch (_) {}
    }
  }
}
