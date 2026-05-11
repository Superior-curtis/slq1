import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { doc, getFirestore, type Firestore } from "firebase/firestore";
import { upsertUserProfile } from "./firebaseShared";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseEnabled = false;

export type FirebaseSessionUser = {
  uid: string;
  email: string;
  displayName: string;
  username: string;
};

const FIREBASE_SESSION_KEY = "porn_guesser_firebase_session";
const FIREBASE_ACCOUNTS_KEY = "porn_guesser_firebase_accounts";

let firebaseApp: FirebaseApp | null = null;

export function getFirebaseApp() {
  if (!isFirebaseEnabled) return null;
  if (!firebaseApp) {
    firebaseApp = getApps().length > 0 ? getApps()[0]! : initializeApp(firebaseConfig);
  }
  return firebaseApp;
}

export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();
  return app ? getAuth(app) : null;
}

export function getFirebaseDb(): Firestore | null {
  const app = getFirebaseApp();
  return app ? getFirestore(app) : null;
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function firebaseUsernameToEmail(username: string) {
  return `${normalizeUsername(username)}@porn-guesser.local`;
}

function hashPassword(password: string) {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(password)).then((buffer) =>
    Array.from(new Uint8Array(buffer))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("")
  );
}

function readSession(): FirebaseSessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(FIREBASE_SESSION_KEY);
    return raw ? (JSON.parse(raw) as FirebaseSessionUser) : null;
  } catch {
    return null;
  }
}

type LocalAccountRecord = FirebaseSessionUser & { passwordHash: string };

function readAccounts(): Record<string, LocalAccountRecord> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(FIREBASE_ACCOUNTS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, LocalAccountRecord>) : {};
  } catch {
    return {};
  }
}

function writeAccounts(accounts: Record<string, LocalAccountRecord>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(FIREBASE_ACCOUNTS_KEY, JSON.stringify(accounts));
}

function writeSession(user: FirebaseSessionUser | null) {
  if (typeof window === "undefined") return;
  if (!user) {
    window.localStorage.removeItem(FIREBASE_SESSION_KEY);
    return;
  }

  window.localStorage.setItem(FIREBASE_SESSION_KEY, JSON.stringify(user));
}

export async function waitForFirebaseUser(): Promise<FirebaseSessionUser | null> {
  return readSession();
}

export async function firebaseRegister(username: string, password: string, email?: string) {
  const normalizedUsername = normalizeUsername(username);
  const uid = normalizedUsername;
  const passwordHash = await hashPassword(password);

  const sessionUser = {
    uid,
    email: email || firebaseUsernameToEmail(normalizedUsername),
    displayName: username,
    username: normalizedUsername,
  } satisfies FirebaseSessionUser;

  const accounts = readAccounts();
  accounts[normalizedUsername] = {
    ...sessionUser,
    passwordHash,
  };
  writeAccounts(accounts);
  writeSession(sessionUser);

  void upsertUserProfile({
    uid,
    email: sessionUser.email,
    username: normalizedUsername,
    displayName: username,
    passwordHash,
  }).catch(() => undefined);

  return sessionUser;
}

export async function firebaseLogin(username: string, password: string) {
  const normalizedUsername = normalizeUsername(username);
  const uid = normalizedUsername;
  const passwordHash = await hashPassword(password);

  const localAccount = readAccounts()[normalizedUsername] ?? null;
  const storedHash = localAccount?.passwordHash || null;

  if (storedHash && storedHash !== passwordHash) {
    throw new Error("Invalid username or password");
  }

  const resolvedEmail = localAccount?.email || firebaseUsernameToEmail(normalizedUsername);
  const resolvedName = localAccount?.displayName || username;

  void upsertUserProfile({
    uid,
    email: resolvedEmail,
      username: localAccount?.username || normalizedUsername,
    displayName: resolvedName,
    passwordHash: storedHash || passwordHash,
  }).catch(() => undefined);

  const sessionUser = {
    uid,
    email: resolvedEmail,
    displayName: resolvedName,
    username: localAccount?.username || normalizedUsername,
  } satisfies FirebaseSessionUser;

  writeSession(sessionUser);

  const updatedAccounts = readAccounts();
  updatedAccounts[normalizedUsername] = {
    ...sessionUser,
    passwordHash: storedHash || passwordHash,
  };
  writeAccounts(updatedAccounts);

  return sessionUser;
}

export async function firebaseLogout() {
  writeSession(null);
}
