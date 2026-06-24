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
  FieldValue,
} from "firebase/firestore";

import { auth, db } from "./firebase.ts";

// CONFIGURATION & INSTANCES

const googleProvider = new GoogleAuthProvider();

const normalizeUsername = (username: string): string => {
  return username.trim().toLowerCase();
};

// INTERFACES

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  username?: string;
  originalUsername?: string;
  avatar?: string | null;
  avatarType?: "emoji" | "google";
  provider?: string;
  createdAt?: FieldValue;
  lastLogin?: FieldValue;
  updatedAt?: FieldValue;
  university?: string;
  program?: string;
}

export interface UpdateUserProfileData {
  name: string;
  username: string;
  university?: string;
  program?: string;
  avatar?: string;
  avatarType?: "emoji" | "google";
}

// ERROR HANDLING

export class ValidationError extends Error {
  public readonly type = "validation" as const;
  public errors: Partial<Record<keyof UpdateUserProfileData, string>>;

  constructor(errors: Partial<Record<keyof UpdateUserProfileData, string>>) {
    super("Error de validación en el perfil.");
    this.name = "ValidationError";
    this.errors = errors;
  }
}

// AUTHENTICATION FUNCTIONS

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
  const { user } = userCredential;
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

export const loginWithGoogle = async () => {
  const userCredential = await signInWithPopup(auth, googleProvider);
  const { user } = userCredential;
  const userRef = doc(db, "users", user.uid);
  const userDoc = await getDoc(userRef);

  if (userDoc.exists()) {
    // Existing user: Updated the photo in case it changed in the Google account
    await updateDoc(userRef, {
      avatar: user.photoURL || (userDoc.data() as UserProfile).avatar,
      lastLogin: serverTimestamp(),
    });
  } else {
    // New user: No username yet (redirects to SetupProfile)
    await setDoc(userRef, {
      uid: user.uid,
      name: user.displayName || "Usuario de Google",
      email: user.email,
      avatar: user.photoURL || null,
      avatarType: "google",
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      provider: "google",
    });
  }

  return user;
};

export const logoutUser = async () => {
  await signOut(auth);
};

export const resetPassword = async (email: string) => {
  await sendPasswordResetEmail(auth, email);
};

// USERNAME MANAGEMENT

export const checkUsernameAvailability = async (
  username: string,
): Promise<boolean> => {
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

// PROFILE SERVICES & VALIDATIONS

export const validateUserProfile = (data: UpdateUserProfileData) => {
  const errors: Partial<Record<keyof UpdateUserProfileData, string>> = {};

  const name = data.name.trim();
  const username = data.username.trim();
  const university = data.university?.trim() ?? "";
  const program = data.program?.trim() ?? "";

  if (university.length > 80)
    errors.university = "La universidad no puede superar los 80 caracteres.";
  if (program.length > 80)
    errors.program = "El programa no puede superar los 80 caracteres.";

  if (name.length < 2)
    errors.name = "El nombre debe tener al menos 2 caracteres.";
  if (name.length > 60)
    errors.name = "El nombre no puede superar los 60 caracteres.";
  if (username.length < 3)
    errors.username = "El usuario debe tener al menos 3 caracteres.";
  if (username.length > 20)
    errors.username = "El usuario no puede superar los 20 caracteres.";
  if (!/^[a-zA-Z0-9._]+$/.test(username)) {
    errors.username =
      "El usuario solo puede contener letras, números, puntos y guiones bajos.";
  }

  return errors;
};

export const getUserProfile = async (
  uid: string,
): Promise<UserProfile | null> => {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return null;

  return {
    uid,
    ...userSnap.data(),
  } as UserProfile;
};

export const updateUserProfile = async (
  uid: string,
  data: UpdateUserProfileData,
) => {
  const errors = validateUserProfile(data);

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }

  const lowerCaseUsername = normalizeUsername(data.username);
  const currentProfile = await getUserProfile(uid);

  if (!currentProfile) {
    throw new Error("No se encontró el perfil del usuario.");
  }

  const previousUsername = normalizeUsername(currentProfile.username ?? "");
  const hasUsernameChanged = previousUsername !== lowerCaseUsername;

  if (hasUsernameChanged) {
    const isAvailable = await checkUsernameAvailability(lowerCaseUsername);
    if (!isAvailable) {
      throw new ValidationError({
        username: "Este nombre de usuario ya está en uso.",
      });
    }
  }

  const batch = writeBatch(db);
  const userRef = doc(db, "users", uid);
  const newUsernameRef = doc(db, "usernames", lowerCaseUsername);

  const updateData: Record<string, unknown> = {
    name: data.name.trim(),
    username: lowerCaseUsername,
    originalUsername: data.username.trim(),
    university: data.university?.trim() ?? "",
    program: data.program?.trim() ?? "",
    updatedAt: serverTimestamp(),
  };

  if (data.avatar !== undefined) updateData.avatar = data.avatar;
  if (data.avatarType !== undefined) updateData.avatarType = data.avatarType;

  batch.update(userRef, updateData);

  // Management of unique username indexes based on batch transactions
  if (hasUsernameChanged) {
    if (previousUsername) {
      batch.delete(doc(db, "usernames", previousUsername));
    }
    batch.set(newUsernameRef, {
      uid,
      username: lowerCaseUsername,
      createdAt: serverTimestamp(),
    });
  } else {
    // A safeguard in case the index did not previously exist due to a corrupted record
    const currentUsernameSnap = await getDoc(newUsernameRef);
    if (!currentUsernameSnap.exists()) {
      batch.set(newUsernameRef, {
        uid,
        username: lowerCaseUsername,
        createdAt: serverTimestamp(),
      });
    }
  }

  await batch.commit();

  if (auth.currentUser) {
    await updateProfile(auth.currentUser, { displayName: data.name.trim() });
  }
};

export const deleteUserAccount = async (uid: string) => {
  const currentUser = auth.currentUser;

  if (currentUser?.uid !== uid) {
    throw new Error("No hay una sesión válida para eliminar esta cuenta.");
  }

  const currentProfile = await getUserProfile(uid);
  const currentUsername = normalizeUsername(currentProfile?.username ?? "");
  const batch = writeBatch(db);

  batch.delete(doc(db, "users", uid));

  if (currentUsername) {
    batch.delete(doc(db, "usernames", currentUsername));
  }

  await batch.commit();
  await deleteUser(currentUser);
};

// REAUTHENTICATION HELPERS

export const reauthenticateWithPassword = async (password: string) => {
  const currentUser = auth.currentUser;
  if (!currentUser?.email) {
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

  await reauthenticateWithPopup(currentUser, googleProvider);
};

export const getCurrentUserProvider = (): string | null => {
  const currentUser = auth.currentUser;
  if (!currentUser) return null;

  const providerId = currentUser.providerData[0]?.providerId;

  if (providerId === "google.com") return "google";
  if (providerId === "password") return "email";

  return providerId ?? null;
};
