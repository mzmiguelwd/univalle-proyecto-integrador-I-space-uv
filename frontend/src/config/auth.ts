import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
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
