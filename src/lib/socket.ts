// Real-time care-team sync over Socket.io.
// Backend events live in vyasa-backend/src/index.ts (clinic + patient rooms):
//   join_patient / leave_patient, chat_message (persist + broadcast),
//   vitals_update, patient_status_change.
import { io, type Socket } from 'socket.io-client';
import { getAccessToken } from './api';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import type { Vitals, ChatMessage } from '@/types';

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'https://vyasa-os-backend.onrender.com';

let socket: Socket | null = null;
let connectedToken = '';

export function connectSocket(): Socket | null {
  const token = getAccessToken();
  if (!token) return null;

  // Reuse the live connection for the same user/token.
  if (socket && connectedToken === token) {
    if (!socket.connected) socket.connect();
    return socket;
  }
  // Token changed (e.g. a different user logged in) — tear the old one down.
  if (socket) { socket.removeAllListeners(); socket.disconnect(); socket = null; }
  connectedToken = token;

  // Allow polling fallback — many mobile/corporate networks block raw websocket,
  // and without this the socket silently never connects (chat appears "broken").
  socket = io(BASE, { auth: { token }, transports: ['websocket', 'polling'], reconnection: true });

  // Vitals recorded by another staff member → merge into store (dedupe by id).
  // The backend excludes the sender (socket.to), so there is no echo loop.
  socket.on('vitals_update', (v: Vitals) => {
    if (!v?.patientId || !v?.id) return;
    const st = useAppStore.getState();
    const list = st.vitals[v.patientId] ?? [];
    if (list.some(x => x.id === v.id)) return;
    useAppStore.setState({ vitals: { ...st.vitals, [v.patientId]: [v, ...list] } });
  });

  // Care-team chat — backend echoes to everyone in the patient room (incl. sender).
  socket.on('chat_message', (m: ChatMessage) => ingestChatMessage(m));

  return socket;
}

// Add a chat message to the store, de-duped by id (used by the socket listener
// and the REST fallback so a message is never shown twice).
export function ingestChatMessage(m: ChatMessage) {
  if (!m?.patientId || !m?.id) return;
  const st = useAppStore.getState();
  const list = st.chatMessages[m.patientId] ?? [];
  if (list.some(x => x.id === m.id)) return;
  useAppStore.setState({ chatMessages: { ...st.chatMessages, [m.patientId]: [...list, m] } });
}

export function disconnectSocket() {
  if (socket) { socket.removeAllListeners(); socket.disconnect(); socket = null; connectedToken = ''; }
}

export function joinPatientRoom(patientId: string) {
  connectSocket()?.emit('join_patient', patientId);
}

export function leavePatientRoom(patientId: string) {
  socket?.emit('leave_patient', patientId);
}

export function emitVitalsUpdate(v: Vitals) {
  connectSocket()?.emit('vitals_update', v);
}

export function emitChatMessage(patientId: string, message: string) {
  const u = useAuthStore.getState().user;
  const id = `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  // 1) Optimistic — show immediately on the sender's screen (this is what
  //    "worked before"; it no longer depends on the socket round-trip).
  if (u) {
    ingestChatMessage({
      id, patientId, senderId: u.id, senderName: u.name, senderRole: u.role,
      message, time: new Date().toISOString(),
    } as ChatMessage);
  }
  // 2) Persist over REST with the SAME id (guaranteed, like vitals/labs), FIRST
  //    and independent of the socket so nothing can skip it. The poll/history
  //    reload returns this same id → de-duped, never doubled. Surface failures.
  import('./api').then(({ api, isApiEnabled }) => {
    if (!isApiEnabled()) return;
    const body = { id, patientId, message };
    api.post('/chat', body)
      // one retry after a short delay — survives a brief backend restart / cold start
      .catch(() => new Promise(r => setTimeout(r, 1500)).then(() => api.post('/chat', body)))
      .catch((e: unknown) => {
        useAppStore.getState().showToast(`Chat not saved: ${e instanceof Error ? e.message : 'network error'}`, 'error');
      });
  });
  try { connectSocket(); } catch { /* socket is best-effort, never blocks send */ }
}
