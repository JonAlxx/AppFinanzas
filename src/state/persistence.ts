import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from '../data/types';

const STATE_KEY = '@finanzas/state-v2';
const ONBOARDING_KEY = '@finanzas/has-seen-onboarding-v2';

export async function loadState(): Promise<AppState | null> {
  try {
    const raw = await AsyncStorage.getItem(STATE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppState;
  } catch {
    return null;
  }
}

export async function saveState(state: AppState): Promise<void> {
  try {
    await AsyncStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export async function hasSeenOnboarding(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(ONBOARDING_KEY);
    return v === 'true';
  } catch {
    return false;
  }
}

export async function markOnboardingSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
  } catch {
    // ignore
  }
}

export async function clearPersistence(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([STATE_KEY, ONBOARDING_KEY]);
  } catch {
    // ignore
  }
}
