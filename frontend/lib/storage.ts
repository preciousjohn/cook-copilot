// ─────────────────────────────────────────────────────────────────────────────
// localStorage read/write helpers with versioned keys
// ─────────────────────────────────────────────────────────────────────────────

const PROFILES_KEY = "cookpilot_profiles_v2";
const SELECTED_PROFILE_KEY = "cookpilot_selected_profile_v2";
const SETTINGS_KEY = "cookpilot_settings_v1";

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage quota exceeded — silently ignore
  }
}

function remove(key: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(key);
}

export const storage = {
  profiles: {
    get: <T>() => read<T[]>(PROFILES_KEY) ?? [],
    set: <T>(v: T[]) => write(PROFILES_KEY, v),
  },
  selectedProfile: {
    get: () => read<string>(SELECTED_PROFILE_KEY),
    set: (id: string | null) =>
      id ? write(SELECTED_PROFILE_KEY, id) : remove(SELECTED_PROFILE_KEY),
  },
  settings: {
    get: <T>() => read<T>(SETTINGS_KEY),
    set: <T>(v: T) => write(SETTINGS_KEY, v),
  },
};
