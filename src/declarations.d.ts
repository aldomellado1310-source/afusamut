/// <reference types="vite/client" />

// ─── lucide-react shim ────────────────────────────────────────────────────────
declare module 'lucide-react' {
  import type { FC, SVGProps } from 'react';

  export interface LucideProps extends SVGProps<SVGSVGElement> {
    size?: number | string;
    absoluteStrokeWidth?: boolean;
  }

  export type LucideIcon = FC<LucideProps>;

  export const Shield: LucideIcon;
  export const Users: LucideIcon;
  export const FileText: LucideIcon;
  export const Vote: LucideIcon;
  export const DollarSign: LucideIcon;
  export const Gift: LucideIcon;
  export const ArrowRight: LucideIcon;
  export const Menu: LucideIcon;
  export const X: LucideIcon;
  export const Check: LucideIcon;
  export const AlertCircle: LucideIcon;
  export const Plus: LucideIcon;
  export const Search: LucideIcon;
  export const ChevronRight: LucideIcon;
  export const BarChart2: LucideIcon;
  export const Calendar: LucideIcon;
  export const Phone: LucideIcon;
  export const Mail: LucideIcon;
  export const Award: LucideIcon;
  export const Lock: LucideIcon;
  export const Layers: LucideIcon;
  export const CheckCircle2: LucideIcon;
  export const FileSpreadsheet: LucideIcon;
  export const Send: LucideIcon;
  export const MessageSquare: LucideIcon;
  export const Clock: LucideIcon;
  export const Printer: LucideIcon;
}

// ─── firebase/app shim ────────────────────────────────────────────────────────
declare module 'firebase/app' {
  export interface FirebaseApp { name: string; options: object; }
  export interface FirebaseOptions {
    apiKey?: string; authDomain?: string; projectId?: string;
    storageBucket?: string; messagingSenderId?: string; appId?: string;
  }
  export function initializeApp(options: FirebaseOptions, name?: string): FirebaseApp;
  export function getApps(): FirebaseApp[];
  export type { FirebaseApp };
}

// ─── firebase/firestore shim ──────────────────────────────────────────────────
declare module 'firebase/firestore' {
  import type { FirebaseApp } from 'firebase/app';

  export interface Firestore { type: 'firestore'; }
  export interface DocumentReference { id: string; path: string; }
  export interface CollectionReference extends Query { id: string; }
  export interface DocumentSnapshot {
    id: string;
    exists(): boolean;
    data(): Record<string, unknown> | undefined;
  }
  export interface QueryDocumentSnapshot extends DocumentSnapshot {
    data(): Record<string, unknown>;
  }
  export interface QuerySnapshot {
    docs: QueryDocumentSnapshot[];
    empty: boolean;
    size: number;
  }
  export interface Query { type: string; }
  export type Unsubscribe = () => void;
  export type FieldValue = { isEqual(other: FieldValue): boolean };

  export function getFirestore(app?: FirebaseApp): Firestore;
  export function collection(db: Firestore, path: string, ...pathSegments: string[]): CollectionReference;
  export function doc(db: Firestore, path: string, ...pathSegments: string[]): DocumentReference;
  export function doc(ref: CollectionReference, ...pathSegments: string[]): DocumentReference;
  export function addDoc(ref: CollectionReference, data: Record<string, unknown>): Promise<DocumentReference>;
  export function setDoc(ref: DocumentReference, data: Record<string, unknown>, options?: { merge?: boolean }): Promise<void>;
  export function updateDoc(ref: DocumentReference, data: Record<string, unknown>): Promise<void>;
  export function deleteDoc(ref: DocumentReference): Promise<void>;
  export function getDoc(ref: DocumentReference): Promise<DocumentSnapshot>;
  export function onSnapshot(ref: Query | DocumentReference, cb: (snap: QuerySnapshot) => void): Unsubscribe;
  export function query(ref: CollectionReference, ...constraints: QueryConstraint[]): Query;
  export function orderBy(field: string, direction?: 'asc' | 'desc'): QueryConstraint;
  export function where(field: string, op: string, value: unknown): QueryConstraint;
  export function increment(n: number): FieldValue;
  export function arrayUnion(...items: unknown[]): FieldValue;
  export interface QueryConstraint { type: string; }
}

// ─── firebase/auth shim ───────────────────────────────────────────────────────
declare module 'firebase/auth' {
  import type { FirebaseApp } from 'firebase/app';

  export interface User {
    uid: string;
    email: string | null;
    displayName: string | null;
    emailVerified: boolean;
  }
  export interface UserCredential { user: User; }
  export interface Auth { app: FirebaseApp; currentUser: User | null; }

  export function getAuth(app?: FirebaseApp): Auth;
  export function signInWithEmailAndPassword(auth: Auth, email: string, password: string): Promise<UserCredential>;
  export function signOut(auth: Auth): Promise<void>;
  export function onAuthStateChanged(auth: Auth, cb: (user: User | null) => void): () => void;
  export type { User, Auth };
}
