import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { UserData, Fund, FinancialData, HistoryEntry, Child, Operation, Alert, WatchlistItem, RecurringContribution } from './types';

// ── Documento compartido por toda la familia ─────────────────────────────
// Ambos usuarios (Tomás y Susana) leen y escriben el MISMO documento.
const SHARED_DOC_ID = 'familia-ferrandiz';
const sharedRef = () => doc(db, 'shared', SHARED_DOC_ID);

export async function loadUserData(_uid: string): Promise<Partial<UserData>> {
  const snap = await getDoc(sharedRef());
  if (snap.exists()) return snap.data() as UserData;
  return {};
}

export async function saveUserData(_uid: string, data: Partial<UserData>): Promise<void> {
  await setDoc(sharedRef(), data, { merge: true });
}

export async function saveFunds(_uid: string, funds: Fund[]): Promise<void> {
  await setDoc(sharedRef(), { funds }, { merge: true });
}

export async function saveFinancialData(_uid: string, data: FinancialData): Promise<void> {
  await setDoc(sharedRef(), { data }, { merge: true });
}

export async function saveHistory(_uid: string, history: HistoryEntry[]): Promise<void> {
  await setDoc(sharedRef(), { history }, { merge: true });
}

export async function saveChildren(_uid: string, children: Child[]): Promise<void> {
  await setDoc(sharedRef(), { children }, { merge: true });
}

export async function saveOperations(_uid: string, operations: Operation[]): Promise<void> {
  await setDoc(sharedRef(), { operations }, { merge: true });
}

export async function saveAlerts(_uid: string, alerts: Alert[]): Promise<void> {
  await setDoc(sharedRef(), { alerts }, { merge: true });
}

export async function saveWatchlist(_uid: string, watchlist: WatchlistItem[]): Promise<void> {
  await setDoc(sharedRef(), { watchlist }, { merge: true });
}

export async function saveRecurring(_uid: string, recurring: RecurringContribution[]): Promise<void> {
  await setDoc(sharedRef(), { recurring }, { merge: true });
}
