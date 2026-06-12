import {
  addDoc,
  collection,
  getDocs,
  getDoc,
  orderBy,
  query,
  serverTimestamp,
  where,
  type Timestamp,
  onSnapshot,
  type Unsubscribe,
  doc,
  updateDoc,
} from "firebase/firestore";

import { db } from "./firebase";

export type StudyRoom = {
  id: string;
  title: string;
  topic: string;
  ownerId: string;
  type: string;
  limit: number;
  privacy: string;
  createdAt?: Timestamp;
  isActive: boolean;
};

export type CreateStudyRoomData = Omit<
  StudyRoom,
  "id" | "createdAt" | "isActive"
>;

export const getRoomById = async (roomId: string): Promise<StudyRoom | null> => {
  const roomRef = doc(db, "rooms", roomId);
  const roomSnap = await getDoc(roomRef);
 
  if (!roomSnap.exists()) return null;
 
  const data = roomSnap.data() as Omit<StudyRoom, "id">;

  // Sala encontrada pero ya no está activa
  if (!data.isActive) return null;
 
  return { id: roomSnap.id, ...data };
};

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

export const createStudyRoom = async (data: CreateStudyRoomData) => {
  const errors = validateStudyRoom(data);

  if (Object.keys(errors).length > 0) {
    throw new Error("Los datos de la sala no son válidos.");
  }

  const roomRef = await addDoc(collection(db, "rooms"), {
    title: data.title.trim(),
    topic: data.topic.trim(),
    ownerId: data.ownerId,
    createdAt: serverTimestamp(),
    isActive: true,
  });

  return roomRef.id;
};

export const getOwnStudyRooms = async (
  ownerId: string,
): Promise<StudyRoom[]> => {
  const roomsQuery = query(
    collection(db, "rooms"),
    where("ownerId", "==", ownerId),
    where("isActive", "==", true),
    orderBy("createdAt", "desc"),
  );

  const roomsSnap = await getDocs(roomsQuery);

  return roomsSnap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<StudyRoom, "id">),
  }));
};

export const subscribeToOwnStudyRooms = (
  ownerId: string,
  onRoomsChange: (rooms: StudyRoom[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe => {
  const roomsQuery = query(
    collection(db, "rooms"),
    where("ownerId", "==", ownerId),
    where("isActive", "==", true),
    orderBy("createdAt", "desc"),
  );

  return onSnapshot(
    roomsQuery,
    (roomsSnap) => {
      const rooms = roomsSnap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<StudyRoom, "id">),
      }));

      onRoomsChange(rooms);
    },
    (error) => {
      if (onError) {
        onError(error);
      }
    },
  );
};

export const endStudyRoom = async (roomId: string) => {
  const roomRef = doc(db, "rooms", roomId);
  await updateDoc(roomRef, {
    isActive: false,
  });
};

export const updateStudyRoom = async (
  roomId: string,
  data: Partial<CreateStudyRoomData>,
) => {
  const roomRef = doc(db, "rooms", roomId);
  // Aquí usamos updateDoc para modificar solo los campos que cambien
  await updateDoc(roomRef, {
    ...data,
    updatedAt: serverTimestamp(), // Opcional: para saber cuándo se editó
  });
};
