// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { Linking, Platform } from 'react-native';
import { getServerUrl } from '../api/config';

const CURRENT_VERSION = '0.0.7'; // bump this on each release

interface UpdateInfo {
  version: string;
  apkName: string;
  releaseDate: string;
  notes?: string;
}

function semverGt(a: string, b: string): boolean {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) > (pb[i] ?? 0)) return true;
    if ((pa[i] ?? 0) < (pb[i] ?? 0)) return false;
  }
  return false;
}

export function useAppUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    checkForUpdate();
  }, []);

  async function checkForUpdate() {
    try {
      const baseUrl = await getServerUrl();
      const res = await fetch(`${baseUrl}/api/updates/android/latest-android.json`, {
        cache: 'no-store',
      });
      if (!res.ok) return;
      const info: UpdateInfo = await res.json();
      if (semverGt(info.version, CURRENT_VERSION)) {
        setUpdateInfo(info);
        setUpdateAvailable(true);
      }
    } catch (e) {
      // Silent fail — update check is non-critical
      console.log('Update check failed:', e);
    }
  }

  const downloadAndInstall = useCallback(async () => {
    if (!updateInfo) return;
    try {
      const baseUrl = await getServerUrl();
      // Open APK URL directly — Android will download via system downloader
      // and prompt to install when complete
      const apkUrl = `${baseUrl}/api/updates/android/${updateInfo.apkName}`;
      await Linking.openURL(apkUrl);
    } catch (e) {
      console.log('Update download failed:', e);
    }
  }, [updateInfo]);

  return { updateAvailable, updateInfo, downloadAndInstall, checkForUpdate };
}
