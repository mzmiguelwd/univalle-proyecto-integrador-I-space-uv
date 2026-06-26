import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "../config/firebase.ts";

// INTERFACES

export interface AuthSessionState {
  user: User | null;
  hasUsername: boolean;
  isLoading: boolean;
  setHasUsername: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Hook to manage authentication state and user profile completion.
 * Handles Firebase auth listener and Firestore username verification.
 */
export function useAuthSession(): AuthSessionState {
  const [user, setUser] = useState<User | null>(null);
  const [hasUsername, setHasUsername] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);

        try {
          const userRef = doc(db, "users", currentUser.uid);
          const userDoc = await getDoc(userRef);

          const isProfileComplete =
            userDoc.exists() && Boolean(userDoc.data()?.username);
          setHasUsername(isProfileComplete);
        } catch (error: unknown) {
          console.error("Error al verificar el nombre de usuario:", error);
          setHasUsername(false);
        }
      } else {
        setUser(null);
        setHasUsername(false);
      }

      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, hasUsername, isLoading, setHasUsername };
}
