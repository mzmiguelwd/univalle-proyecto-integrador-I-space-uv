import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  deleteUser,
  updateProfile,
  EmailAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
} from "firebase/auth";
import {
  doc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  getDoc,
  deleteDoc,
} from "firebase/firestore";

import { auth, db } from "./firebase.ts";

const googleProvider = new GoogleAuthProvider();

export const registerWithEmail = async (
  email: string,
  password: string,
  name: string,
) => {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password,
  );
  const user = userCredential.user;

  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    name: name,
    email: email,
    createdAt: serverTimestamp(),
    lastLogin: serverTimestamp(),
    role: "student",
    provider: "email",
  });

  return user;
};

export const loginWithEmail = async (email: string, password: string) => {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password,
  );
  return userCredential.user;
};

export const loginWithGoogle = async () => {
  const userCredential = await signInWithPopup(auth, googleProvider);
  const user = userCredential.user;
  const userRef = doc(db, "users", user.uid);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      name: user.displayName || "Usuario de Google",
      email: user.email,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      role: "student",
      provider: "google",
    });
  } else {
    await updateDoc(userRef, {
      lastLogin: serverTimestamp(),
    }).catch(console.error);
  }

  return user;
};

export const logoutUser = async () => {
  await signOut(auth);
};

export const checkUsernameAvailability = async (
  username: string,
): Promise<boolean> => {
  const lowerCaseUsername = username.toLowerCase();
  const q = query(
    collection(db, "users"),
    where("username", "==", lowerCaseUsername),
  );
  const querySnapshot = await getDocs(q);

  return querySnapshot.empty;
};

export const saveUsername = async (uid: string, username: string) => {
  const lowerCaseUsername = username.toLowerCase();
  await setDoc(
    doc(db, "users", uid),
    { username: lowerCaseUsername, originalUsername: username },
    { merge: true },
  );
};

export const resetPassword = async (email: string) => {
  await sendPasswordResetEmail(auth, email);
};

export type UserProfile = {
  uid: string;
  name: string;
  email: string;
  username?: string;
  originalUsername?: string;
  bio?: string;
  studyArea?: string;
  role?: string;
  provider?: string;
  createdAt?: unknown;
  lastLogin?: unknown;
  updatedAt?: unknown;
  university?: string;
  program?: string;
  interests?: string;
  availability?: string;
  notificationsEnabled?: boolean;
  studyMode?: string;
  visibleStatus?: boolean;
  dailyGoalHours?: number;
};

export type UpdateUserProfileData = {
  name: string;
  username: string;
  bio?: string;
  studyArea?: string;
  university?: string;
  program?: string;
  interests?: string;
  availability?: string;
  notificationsEnabled?: boolean;
  studyMode?: string;
  visibleStatus?: boolean;
  dailyGoalHours?: number;
};

export const validateUserProfile = (data: UpdateUserProfileData) => {
  const errors: Partial<Record<keyof UpdateUserProfileData, string>> = {};

  const name = data.name.trim();
  const username = data.username.trim();
  const bio = data.bio?.trim() || "";
  const studyArea = data.studyArea?.trim() || "";
  const university = data.university?.trim() || "";
  const program = data.program?.trim() || "";
  const interests = data.interests?.trim() || "";
  const availability = data.availability?.trim() || "";
  const studyMode = data.studyMode?.trim() || "";

  if (university.length > 80) {
    errors.university = "La universidad no puede superar los 80 caracteres.";
  }

  if (program.length > 80) {
    errors.program = "El programa no puede superar los 80 caracteres.";
  }

  if (interests.length > 160) {
    errors.interests = "Los intereses no pueden superar los 160 caracteres.";
  }

  if (availability.length > 80) {
    errors.availability = "La disponibilidad no puede superar los 80 caracteres.";
  }

  if (studyMode.length > 40) {
    errors.studyMode = "El modo de estudio no puede superar los 40 caracteres.";
  }

  if (
    data.dailyGoalHours !== undefined &&
    (Number.isNaN(data.dailyGoalHours) ||
      data.dailyGoalHours < 1 ||
      data.dailyGoalHours > 24)
  ) {
    errors.dailyGoalHours = "La meta diaria debe estar entre 1 y 24 horas.";
  }

  if (name.length < 2) {
    errors.name = "El nombre debe tener al menos 2 caracteres.";
  }

  if (name.length > 60) {
    errors.name = "El nombre no puede superar los 60 caracteres.";
  }

  if (username.length < 3) {
    errors.username = "El usuario debe tener al menos 3 caracteres.";
  }

  if (username.length > 20) {
    errors.username = "El usuario no puede superar los 20 caracteres.";
  }

  if (!/^[a-zA-Z0-9._]+$/.test(username)) {
    errors.username =
      "El usuario solo puede contener letras, números, puntos y guiones bajos.";
  }

  if (bio.length > 160) {
    errors.bio = "La biografía no puede superar los 160 caracteres.";
  }

  if (studyArea.length > 80) {
    errors.studyArea = "El área de estudio no puede superar los 80 caracteres.";
  }

  return errors;
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    return null;
  }

  return userSnap.data() as UserProfile;
};

export const updateUserProfile = async (
  uid: string,
  data: UpdateUserProfileData,
) => {
  const errors = validateUserProfile(data);

  if (Object.keys(errors).length > 0) {
    throw {
      type: "validation",
      errors,
    };
  }

  const lowerCaseUsername = data.username.trim().toLowerCase();
  const currentProfile = await getUserProfile(uid);

  if (!currentProfile) {
    throw new Error("No se encontró el perfil del usuario.");
  }

  if (currentProfile.username !== lowerCaseUsername) {
    const isAvailable = await checkUsernameAvailability(lowerCaseUsername);

    if (!isAvailable) {
      throw {
        type: "validation",
        errors: {
          username: "Este nombre de usuario ya está en uso.",
        },
      };
    }
  }

  await updateDoc(doc(db, "users", uid), {
    name: data.name.trim(),
    username: lowerCaseUsername,
    originalUsername: data.username.trim(),
    bio: data.bio?.trim() || "",
    studyArea: data.studyArea?.trim() || "",
    university: data.university?.trim() || "",
    program: data.program?.trim() || "",
    interests: data.interests?.trim() || "",
    availability: data.availability?.trim() || "",
    notificationsEnabled: data.notificationsEnabled ?? true,
    studyMode: data.studyMode?.trim() || "Deep Work",
    visibleStatus: data.visibleStatus ?? true,
    dailyGoalHours: data.dailyGoalHours ?? 6,
    updatedAt: serverTimestamp(),
  });

  if (auth.currentUser) {
    await updateProfile(auth.currentUser, {
      displayName: data.name.trim(),
    });
  }
};

export const deleteUserAccount = async (uid: string) => {
  const currentUser = auth.currentUser;

  if (!currentUser || currentUser.uid !== uid) {
    throw new Error("No hay una sesión válida para eliminar esta cuenta.");
  }

  const userRef = doc(db, "users", uid);

  await deleteDoc(userRef);
  await deleteUser(currentUser);
};

export const reauthenticateWithPassword = async (password: string) => {
  const currentUser = auth.currentUser;

  if (!currentUser || !currentUser.email) {
    throw new Error("No hay una sesión válida para reautenticar.");
  }

  const credential = EmailAuthProvider.credential(currentUser.email, password);

  await reauthenticateWithCredential(currentUser, credential);
};

export const reauthenticateWithGoogle = async () => {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("No hay una sesión válida para reautenticar.");
  }

  const provider = new GoogleAuthProvider();

  await reauthenticateWithPopup(currentUser, provider);
};

export const getCurrentUserProvider = () => {
  const currentUser = auth.currentUser;

  if (!currentUser) return null;

  const providerId = currentUser.providerData[0]?.providerId;

  if (providerId === "google.com") return "google";
  if (providerId === "password") return "email";

  return providerId || null;
};