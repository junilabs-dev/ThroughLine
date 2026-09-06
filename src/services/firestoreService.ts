import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, cleanPayload } from './firebase';
import type {
  JournalSession,
  ChatMessage,
  Goal,
  Bookmark,
  WeeklyReflection,
  ThinkingMapData,
  PersonalInsightsData,
  UserSettings,
  Decision,
  ActionPlan,
  UnresolvedThought,
  PatternsData,
} from '../types';

/**
 * Journal Sessions
 */
export async function getJournalSessions(uid: string): Promise<JournalSession[]> {
  if (!uid) return [];
  const colRef = collection(db, 'users', uid, 'journalSessions');
  const q = query(colRef, orderBy('updatedAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as JournalSession[];
}

export async function getJournalSession(uid: string, sessionId: string): Promise<JournalSession | null> {
  if (!uid || !sessionId) return null;
  const docRef = doc(db, 'users', uid, 'journalSessions', sessionId);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as JournalSession;
}

export async function saveJournalSession(uid: string, session: JournalSession): Promise<void> {
  if (!uid || !session.id) throw new Error('Missing UID or session ID');
  const docRef = doc(db, 'users', uid, 'journalSessions', session.id);
  const sanitized = cleanPayload(session);
  await setDoc(docRef, sanitized, { merge: true });
}

export async function deleteJournalSession(uid: string, sessionId: string): Promise<void> {
  if (!uid || !sessionId) return;
  // Also clean up subcollection messages
  const msgsRef = collection(db, 'users', uid, 'journalSessions', sessionId, 'messages');
  const msgsSnap = await getDocs(msgsRef);
  for (const m of msgsSnap.docs) {
    await deleteDoc(m.ref);
  }
  const docRef = doc(db, 'users', uid, 'journalSessions', sessionId);
  await deleteDoc(docRef);
}

/**
 * Multi-Turn Conversation Messages within a Session
 */
export async function getSessionMessages(uid: string, sessionId: string): Promise<ChatMessage[]> {
  if (!uid || !sessionId) return [];
  const colRef = collection(db, 'users', uid, 'journalSessions', sessionId, 'messages');
  const q = query(colRef, orderBy('timestamp', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as ChatMessage[];
}

export async function saveSessionMessage(uid: string, sessionId: string, message: ChatMessage): Promise<void> {
  if (!uid || !sessionId || !message.id) throw new Error('Missing UID, session ID, or message ID');
  const docRef = doc(db, 'users', uid, 'journalSessions', sessionId, 'messages', message.id);
  const sanitized = cleanPayload(message);
  await setDoc(docRef, sanitized, { merge: true });
}

/**
 * Decisions (Decision Room)
 */
export async function getDecisions(uid: string): Promise<Decision[]> {
  if (!uid) return [];
  const colRef = collection(db, 'users', uid, 'decisions');
  const q = query(colRef, orderBy('updatedAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as Decision[];
}

export async function getDecision(uid: string, decisionId: string): Promise<Decision | null> {
  if (!uid || !decisionId) return null;
  const docRef = doc(db, 'users', uid, 'decisions', decisionId);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as Decision;
}

export async function saveDecision(uid: string, decision: Decision): Promise<void> {
  if (!uid || !decision.id) throw new Error('Missing UID or decision ID');
  const docRef = doc(db, 'users', uid, 'decisions', decision.id);
  const sanitized = cleanPayload(decision);
  await setDoc(docRef, sanitized, { merge: true });
}

export async function deleteDecision(uid: string, decisionId: string): Promise<void> {
  if (!uid || !decisionId) return;
  const docRef = doc(db, 'users', uid, 'decisions', decisionId);
  await deleteDoc(docRef);
}

/**
 * Action Plans (Thought -> Action Engine)
 */
export async function getActionPlans(uid: string): Promise<ActionPlan[]> {
  if (!uid) return [];
  const colRef = collection(db, 'users', uid, 'actionPlans');
  const q = query(colRef, orderBy('updatedAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as ActionPlan[];
}

export async function saveActionPlan(uid: string, plan: ActionPlan): Promise<void> {
  if (!uid || !plan.id) throw new Error('Missing UID or plan ID');
  const docRef = doc(db, 'users', uid, 'actionPlans', plan.id);
  const sanitized = cleanPayload(plan);
  await setDoc(docRef, sanitized, { merge: true });
}

export async function deleteActionPlan(uid: string, planId: string): Promise<void> {
  if (!uid || !planId) return;
  const docRef = doc(db, 'users', uid, 'actionPlans', planId);
  await deleteDoc(docRef);
}

/**
 * Unresolved Thoughts Tracker
 */
export async function getUnresolvedThoughts(uid: string): Promise<UnresolvedThought[]> {
  if (!uid) return [];
  const colRef = collection(db, 'users', uid, 'unresolvedThoughts');
  const q = query(colRef, orderBy('updatedAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as UnresolvedThought[];
}

export async function saveUnresolvedThought(uid: string, thought: UnresolvedThought): Promise<void> {
  if (!uid || !thought.id) throw new Error('Missing UID or thought ID');
  const docRef = doc(db, 'users', uid, 'unresolvedThoughts', thought.id);
  const sanitized = cleanPayload(thought);
  await setDoc(docRef, sanitized, { merge: true });
}

export async function deleteUnresolvedThought(uid: string, thoughtId: string): Promise<void> {
  if (!uid || !thoughtId) return;
  const docRef = doc(db, 'users', uid, 'unresolvedThoughts', thoughtId);
  await deleteDoc(docRef);
}

/**
 * Goals
 */
export async function getGoals(uid: string): Promise<Goal[]> {
  if (!uid) return [];
  const colRef = collection(db, 'users', uid, 'goals');
  const q = query(colRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as Goal[];
}

export async function saveGoal(uid: string, goal: Goal): Promise<void> {
  if (!uid || !goal.id) throw new Error('Missing UID or goal ID');
  const docRef = doc(db, 'users', uid, 'goals', goal.id);
  const sanitized = cleanPayload(goal);
  await setDoc(docRef, sanitized, { merge: true });
}

export async function deleteGoal(uid: string, goalId: string): Promise<void> {
  if (!uid || !goalId) return;
  const docRef = doc(db, 'users', uid, 'goals', goalId);
  await deleteDoc(docRef);
}

/**
 * Bookmarks & Saved Items
 */
export async function getBookmarks(uid: string): Promise<Bookmark[]> {
  if (!uid) return [];
  const colRef = collection(db, 'users', uid, 'bookmarks');
  const q = query(colRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as Bookmark[];
}

export async function saveBookmark(uid: string, bookmark: Bookmark): Promise<void> {
  if (!uid || !bookmark.id) throw new Error('Missing UID or bookmark ID');
  const docRef = doc(db, 'users', uid, 'bookmarks', bookmark.id);
  const sanitized = cleanPayload(bookmark);
  await setDoc(docRef, sanitized, { merge: true });
}

export async function deleteBookmark(uid: string, bookmarkId: string): Promise<void> {
  if (!uid || !bookmarkId) return;
  const docRef = doc(db, 'users', uid, 'bookmarks', bookmarkId);
  await deleteDoc(docRef);
}

/**
 * Weekly Reflections
 */
export async function getWeeklyReflections(uid: string): Promise<WeeklyReflection[]> {
  if (!uid) return [];
  const colRef = collection(db, 'users', uid, 'weeklyReflections');
  const q = query(colRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as WeeklyReflection[];
}

export async function saveWeeklyReflection(uid: string, reflection: WeeklyReflection): Promise<void> {
  if (!uid || !reflection.id) throw new Error('Missing UID or reflection ID');
  const docRef = doc(db, 'users', uid, 'weeklyReflections', reflection.id);
  const sanitized = cleanPayload(reflection);
  await setDoc(docRef, sanitized, { merge: true });
}

/**
 * Cached Thinking Map
 */
export async function getSavedThinkingMap(uid: string): Promise<ThinkingMapData | null> {
  if (!uid) return null;
  const docRef = doc(db, 'users', uid, 'cache', 'thinkingMap');
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  return snapshot.data() as ThinkingMapData;
}

export async function saveThinkingMap(uid: string, data: ThinkingMapData): Promise<void> {
  if (!uid) return;
  const docRef = doc(db, 'users', uid, 'cache', 'thinkingMap');
  const sanitized = cleanPayload(data);
  await setDoc(docRef, sanitized, { merge: true });
}

/**
 * Cached Insights
 */
export async function getSavedInsights(uid: string): Promise<PersonalInsightsData | null> {
  if (!uid) return null;
  const docRef = doc(db, 'users', uid, 'cache', 'insights');
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  return snapshot.data() as PersonalInsightsData;
}

export async function saveInsights(uid: string, data: PersonalInsightsData): Promise<void> {
  if (!uid) return;
  const docRef = doc(db, 'users', uid, 'cache', 'insights');
  const sanitized = cleanPayload(data);
  await setDoc(docRef, sanitized, { merge: true });
}

/**
 * Cached Patterns & Contradictions
 */
export async function getSavedPatterns(uid: string): Promise<PatternsData | null> {
  if (!uid) return null;
  const docRef = doc(db, 'users', uid, 'cache', 'patterns');
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  return snapshot.data() as PatternsData;
}

export async function savePatterns(uid: string, data: PatternsData): Promise<void> {
  if (!uid) return;
  const docRef = doc(db, 'users', uid, 'cache', 'patterns');
  const sanitized = cleanPayload(data);
  await setDoc(docRef, sanitized, { merge: true });
}

/**
 * User Settings
 */
export async function getUserSettings(uid: string): Promise<UserSettings> {
  const defaultSettings: UserSettings = {
    aiStyle: 'Supportive',
    aiScope: 'all',
    dailyPromptEnabled: true,
    theme: 'dark',
  };
  if (!uid) return defaultSettings;
  try {
    const docRef = doc(db, 'users', uid, 'settings', 'preferences');
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return defaultSettings;
    return { ...defaultSettings, ...snapshot.data() } as UserSettings;
  } catch {
    return defaultSettings;
  }
}

export async function saveUserSettings(uid: string, settings: Partial<UserSettings>): Promise<void> {
  if (!uid) return;
  const docRef = doc(db, 'users', uid, 'settings', 'preferences');
  const sanitized = cleanPayload(settings);
  await setDoc(docRef, sanitized, { merge: true });
}

/**
 * Full User Data Export (Complete GDPR / Data Portability)
 */
export async function exportAllUserData(uid: string) {
  if (!uid) throw new Error('Unauthenticated user');
  const [sessions, goals, bookmarks, weeklyReviews, decisions, actionPlans, unresolvedThoughts] =
    await Promise.all([
      getJournalSessions(uid),
      getGoals(uid),
      getBookmarks(uid),
      getWeeklyReflections(uid),
      getDecisions(uid),
      getActionPlans(uid),
      getUnresolvedThoughts(uid),
    ]);

  // Fetch messages for each session
  const sessionsWithMessages = await Promise.all(
    sessions.map(async (s) => {
      const msgs = await getSessionMessages(uid, s.id);
      return { ...s, conversation: msgs };
    })
  );

  return {
    exportDate: new Date().toISOString(),
    userId: uid,
    totalSessions: sessions.length,
    sessions: sessionsWithMessages,
    goals,
    bookmarks,
    weeklyReviews,
    decisions,
    actionPlans,
    unresolvedThoughts,
  };
}

/**
 * Complete Data Deletion (Right to be Forgotten)
 */
export async function deleteAllUserData(uid: string): Promise<void> {
  if (!uid) return;
  const [sessions, goals, bookmarks, weeklyReviews, decisions, actionPlans, unresolvedThoughts] =
    await Promise.all([
      getJournalSessions(uid),
      getGoals(uid),
      getBookmarks(uid),
      getWeeklyReflections(uid),
      getDecisions(uid),
      getActionPlans(uid),
      getUnresolvedThoughts(uid),
    ]);

  for (const s of sessions) {
    await deleteJournalSession(uid, s.id);
  }
  for (const g of goals) {
    await deleteGoal(uid, g.id);
  }
  for (const b of bookmarks) {
    await deleteBookmark(uid, b.id);
  }
  for (const w of weeklyReviews) {
    await deleteDoc(doc(db, 'users', uid, 'weeklyReflections', w.id));
  }
  for (const d of decisions) {
    await deleteDecision(uid, d.id);
  }
  for (const a of actionPlans) {
    await deleteActionPlan(uid, a.id);
  }
  for (const u of unresolvedThoughts) {
    await deleteUnresolvedThought(uid, u.id);
  }
}
