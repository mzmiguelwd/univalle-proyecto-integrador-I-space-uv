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
  updateDoc,
  getDoc,
  writeBatch,
} from "firebase/firestore";

import { auth, db } from "./firebase.ts";

const googleProvider = new GoogleAuthProvider();

export const registerWithEmail = async (
  email: string,
  password: string,
  name: string,
  username: string,
  avatar: string,
) => {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password,
  );
  const user = userCredential.user;

  const normalizedUsername = normalizeUsername(username);

  const batch = writeBatch(db);

  batch.set(doc(db, "users", user.uid), {
    uid: user.uid,
    name: name,
    username: normalizedUsername,
    originalUsername: username.trim(),
    email: email,
    avatar: avatar,
    avatarType: "emoji",
    createdAt: serverTimestamp(),
    lastLogin: serverTimestamp(),
    role: "student",
    provider: "email",
  });

  batch.set(doc(db, "usernames", normalizedUsername), {
    uid: user.uid,
    username: normalizedUsername,
    createdAt: serverTimestamp(),
  });

  await batch.commit();

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

// ── guarda photoURL de Google como avatar ─────────────
export const loginWithGoogle = async () => {
  const userCredential = await signInWithPopup(auth, googleProvider);
  const user = userCredential.user;
  const userRef = doc(db, "users", user.uid);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    // Usuario nuevo — sin username todavía (va a SetupProfile)
    await setDoc(userRef, {
      uid: user.uid,
      name: user.displayName || "Usuario de Google",
      email: user.email,
      avatar: user.photoURL || null,
      avatarType: "google",
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      role: "student",
      provider: "google",
    });
  } else {
    // Usuario existente — actualizamos foto por si la cambió en Google
    await updateDoc(userRef, {
      avatar: user.photoURL || userDoc.data().avatar,
      lastLogin: serverTimestamp(),
    }).catch(console.error);
  }

  return user;
};

export const logoutUser = async () => {
  await signOut(auth);
};

const normalizeUsername = (username: string) => {
  return username.trim().toLowerCase();
};

export const checkUsernameAvailability = async (username: string) => {
  const normalizedUsername = normalizeUsername(username);

  if (!normalizedUsername) return false;

  const usernameRef = doc(db, "usernames", normalizedUsername);
  const usernameSnap = await getDoc(usernameRef);

  return !usernameSnap.exists();
};

export const saveUsername = async (uid: string, username: string) => {
  const normalizedUsername = normalizeUsername(username);

  if (!normalizedUsername) {
    throw new Error("El nombre de usuario no es válido.");
  }

  const batch = writeBatch(db);

  const userRef = doc(db, "users", uid);
  const usernameRef = doc(db, "usernames", normalizedUsername);

  batch.set(
    userRef,
    {
      username: normalizedUsername,
      originalUsername: username.trim(),
    },
    { merge: true },
  );

  batch.set(usernameRef, {
    uid,
    username: normalizedUsername,
    createdAt: serverTimestamp(),
  });

  await batch.commit();
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
  avatar?: string | null;
  avatarType?: "emoji" | "google";
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
  avatar?: string;
  avatarType?: "emoji" | "google";
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
  if (!userSnap.exists()) return null;

  const data = userSnap.data();
  return {
    uid,
    ...(data as Omit<UserProfile, "uid">),
  };
};

export const updateUserProfile = async (
  uid: string,
  data: UpdateUserProfileData,
) => {
  const errors = validateUserProfile(data);

  if (Object.keys(errors).length > 0) {
    throw { type: "validation", errors };
  }

  const lowerCaseUsername = normalizeUsername(data.username);
  const currentProfile = await getUserProfile(uid);

  if (!currentProfile) {
    throw new Error("No se encontró el perfil del usuario.");
  }

  const previousUsername = normalizeUsername(currentProfile.username || "");

  if (previousUsername !== lowerCaseUsername) {
    const isAvailable = await checkUsernameAvailability(lowerCaseUsername);
    if (!isAvailable) {
      throw {
        type: "validation",
        errors: { username: "Este nombre de usuario ya está en uso." },
      };
    }
  }

  const batch = writeBatch(db);
  const userRef = doc(db, "users", uid);
  const newUsernameRef = doc(db, "usernames", lowerCaseUsername);
  const newUsernameSnap = await getDoc(newUsernameRef);

  const updateData: Record<string, unknown> = {
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
  };

  if (data.avatar !== undefined) updateData.avatar = data.avatar;
  if (data.avatarType !== undefined) updateData.avatarType = data.avatarType;

  batch.update(userRef, updateData);

  if (previousUsername !== lowerCaseUsername) {
    if (previousUsername) {
      const previousUsernameRef = doc(db, "usernames", previousUsername);
      const previousUsernameSnap = await getDoc(previousUsernameRef);
      if (previousUsernameSnap.exists()) {
        batch.delete(previousUsernameRef);
      }
    }
    batch.set(newUsernameRef, {
      uid,
      username: lowerCaseUsername,
      createdAt: serverTimestamp(),
    });
  }

  if (previousUsername === lowerCaseUsername && !newUsernameSnap.exists()) {
    batch.set(newUsernameRef, {
      uid,
      username: lowerCaseUsername,
      createdAt: serverTimestamp(),
    });
  }

  await batch.commit();

  if (auth.currentUser) {
    await updateProfile(auth.currentUser, { displayName: data.name.trim() });
  }
};

export const deleteUserAccount = async (uid: string) => {
  const currentUser = auth.currentUser;

  if (!currentUser || currentUser.uid !== uid) {
    throw new Error("No hay una sesión válida para eliminar esta cuenta.");
  }

  const currentProfile = await getUserProfile(uid);
  const currentUsername = normalizeUsername(currentProfile?.username || "");

  const batch = writeBatch(db);

  batch.delete(doc(db, "users", uid));

  if (currentUsername) {
    batch.delete(doc(db, "usernames", currentUsername));
  }

  await batch.commit();
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