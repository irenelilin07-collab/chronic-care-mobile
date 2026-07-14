import { normalizeMessages } from "./appMessages.js";
import { normalizeOnboarding } from "./onboarding.js";
import { normalizeProfile } from "./profile.js";
import { normalizeJournalEntries } from "./journalEntry.js";
import { DEFAULT_SETTINGS, normalizeSettings } from "./settings.js";

const STORAGE_KEY = "chronic-care-mobile-v1";

export const TABS = {
  today: "today",
  inventory: "inventory",
  appointment: "appointment",
  profile: "profile",
};

export const FONT_SIZES = {
  standard: { key: "standard", label: "标准", className: "font-standard" },
  medium: { key: "medium", label: "中", className: "font-medium" },
  large: { key: "large", label: "大", className: "font-large" },
};

export const defaultState = {
  ui: {
    activeTab: TABS.today,
    fontSize: "standard",
  },
  medicines: [],
  medicationPlans: [],
  intakeRecords: {},
  messages: [],
  appointments: [],
  journalEntries: [],
  settings: structuredClone(DEFAULT_SETTINGS),
  profile: {
    nickname: "用户",
    encouragement: "今天也要记得按时服药哦",
    gender: "",
    birthYear: "",
    chronicDiseases: [],
    drugAllergies: [],
    emergencyContact: {
      name: "",
      phone: "",
      relation: "",
    },
  },
  onboarding: {
    status: "pending",
    completedAt: null,
    source: null,
  },
};

export function normalizeAppState(parsed = {}) {
  return {
    ...structuredClone(defaultState),
    ...parsed,
    ui: { ...defaultState.ui, ...(parsed.ui || {}) },
    settings: normalizeSettings({ ...defaultState.settings, ...(parsed.settings || {}) }),
    profile: normalizeProfile({ ...defaultState.profile, ...(parsed.profile || {}) }),
    journalEntries: normalizeJournalEntries(parsed.journalEntries),
    messages: normalizeMessages(parsed.messages),
    onboarding: normalizeOnboarding(parsed.onboarding),
  };
}

function cacheKeyForHousehold(householdId) {
  return `${STORAGE_KEY}-user-${householdId}`;
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);
    return normalizeAppState(JSON.parse(raw));
  } catch (error) {
    console.error("loadState failed:", error);
    return structuredClone(defaultState);
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadHouseholdCache(householdId) {
  if (!householdId) return null;
  try {
    const raw = localStorage.getItem(cacheKeyForHousehold(householdId));
    if (!raw) return null;
    return normalizeAppState(JSON.parse(raw));
  } catch (error) {
    console.error("loadHouseholdCache failed:", error);
    return null;
  }
}

export function saveHouseholdCache(householdId, state) {
  if (!householdId) return;
  try {
    localStorage.setItem(cacheKeyForHousehold(householdId), JSON.stringify(state));
  } catch (error) {
    console.error("saveHouseholdCache failed:", error);
  }
}
