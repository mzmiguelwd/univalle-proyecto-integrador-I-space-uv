import {
  addDoc,
  collection,
  getDocs,
  getDoc,
  orderBy,
  query,
  serverTimestamp,
  where,
  onSnapshot,
  doc,
  updateDoc,
  type Timestamp,
  type Unsubscribe,
  type FieldValue,
  type Query,
  type DocumentData,
} from "firebase/firestore";

import { db } from "./firebase.ts";

// TYPES & INTERFACES

export interface StudyRoom {
  id: string;
  title: string;
  topic: string;
  ownerId: string;
  type: string;
  limit: number;
  privacy: string;
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
  isActive: boolean;
}

export type CreateStudyRoomData = Omit<
  StudyRoom,
  "id" | "createdAt" | "updatedAt" | "isActive"
>;

// ERROR HANDLING

export class RoomValidationError extends Error {
  public readonly type = "validation" as const;
  public errors: Partial<Record<keyof CreateStudyRoomData, string>>;

  constructor(errors: Partial<Record<keyof CreateStudyRoomData, string>>) {
    super("Error de validación en la sala de estudio.");
    this.name = "RoomValidationError";
    this.errors = errors;
  }
}

// HELPERS

/**
 * Builds the base query for fetching a user's active study rooms.
 */
const buildOwnRoomsQuery = (
  ownerId: string,
): Query<DocumentData, DocumentData> => {
  return query(
    collection(db, "rooms"),
    where("ownerId", "==", ownerId),
    where("isActive", "==", true),
    orderBy("createdAt", "desc"),
  );
};

// VALIDATION

export const validateStudyRoom = (data: CreateStudyRoomData) => {
  const errors: Partial<Record<keyof CreateStudyRoomData, string>> = {};

  const title = data.title.trim();
  const topic = data.topic.trim();

  if (title.length < 3) {
    errors.title = "El nombre de la sala debe tener al menos 3 caracteres.";
  }
  if (title.length > 80) {
    errors.title = "El nombre de la sala no puede superar los 80 caracteres.";
  }
  if (topic.length < 3) {
    errors.topic = "El tema debe tener al menos 3 caracteres.";
  }
  if (topic.length > 120) {
    errors.topic = "El tema no puede superar los 120 caracteres.";
  }
  if (!data.ownerId) {
    errors.ownerId = "No se pudo identificar el usuario creador.";
  }

  return errors;
};

// ROOM SERVICES

export const getRoomById = async (
  roomId: string,
): Promise<StudyRoom | null> => {
  const roomRef = doc(db, "rooms", roomId);
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) return null;

  const data = roomSnap.data() as Omit<StudyRoom, "id">;

  // If the room was found but has already been closed by the host
  if (!data.isActive) return null;

  return { id: roomSnap.id, ...data };
};

export const createStudyRoom = async (
  data: CreateStudyRoomData,
): Promise<string> => {
  const errors = validateStudyRoom(data);

  if (Object.keys(errors).length > 0) {
    throw new RoomValidationError(errors);
  }

  const roomRef = await addDoc(collection(db, "rooms"), {
    ...data,
    title: data.title.trim(),
    topic: data.topic.trim(),
    createdAt: serverTimestamp(),
    isActive: true,
  });

  return roomRef.id;
};

export const getOwnStudyRooms = async (
  ownerId: string,
): Promise<StudyRoom[]> => {
  const roomsQuery = buildOwnRoomsQuery(ownerId);
  const roomsSnap = await getDocs(roomsQuery);

  return roomsSnap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...(docSnap.data() as Omit<StudyRoom, "id">),
  }));
};

export const subscribeToOwnStudyRooms = (
  ownerId: string,
  onRoomsChange: (rooms: StudyRoom[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe => {
  const roomsQuery = buildOwnRoomsQuery(ownerId);

  return onSnapshot(
    roomsQuery,
    (roomsSnap) => {
      const rooms = roomsSnap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<StudyRoom, "id">),
      }));
      onRoomsChange(rooms);
    },
    (error) => {
      console.error("Error al suscribirse a las salas de estudio:", error);
      onError?.(error);
    },
  );
};

export const endStudyRoom = async (roomId: string): Promise<void> => {
  const roomRef = doc(db, "rooms", roomId);

  await updateDoc(roomRef, {
    isActive: false,
    updatedAt: serverTimestamp(),
  });
};

export const updateStudyRoom = async (
  roomId: string,
  data: Partial<CreateStudyRoomData>,
): Promise<void> => {
  const roomRef = doc(db, "rooms", roomId);
  const updatePayload = { ...data };

  if (updatePayload.title) updatePayload.title = updatePayload.title.trim();
  if (updatePayload.topic) updatePayload.topic = updatePayload.topic.trim();

  await updateDoc(roomRef, {
    ...updatePayload,
    updatedAt: serverTimestamp(),
  });
};
