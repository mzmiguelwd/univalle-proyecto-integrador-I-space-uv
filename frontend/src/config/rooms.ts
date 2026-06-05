import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
  type Timestamp,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";

import { db } from "./firebase";

export type StudyRoom = {
  id: string;
  title: string;
  topic: string;
  ownerId: string;
  createdAt?: Timestamp;
  isActive: boolean;
};

export type CreateStudyRoomData = {
  title: string;
  topic: string;
  ownerId: string;
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