import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_SERVER = 'http://100.79.84.66:3100';
const SERVER_KEY = 'paperclip_server_url';
const TOKEN_KEY = 'paperclip_session_token';

export async function getServerUrl(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(SERVER_KEY);
    return saved?.trim() || DEFAULT_SERVER;
  } catch {
    return DEFAULT_SERVER;
  }
}

export async function setServerUrl(url: string): Promise<void> {
  await AsyncStorage.setItem(SERVER_KEY, url);
}

export async function getToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string | null): Promise<void> {
  if (token == null) {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } else {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  }
}

// Keep API_BASE for any legacy references (synchronous fallback)
export const API_BASE = DEFAULT_SERVER;
