import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "../config/firebase.ts";

/**
 * Hook to manage authentication state and user profile completion.
 * Handles Firebase auth listener and Firestore username verification.
 */
export function useAuthSession() {
  const [user, setUser] = useState<User | null>(null);
  const [hasUsername, setHasUsername] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setIsLoading(true);

      if (currentUser) {
        setUser(currentUser);
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          setHasUsername(userDoc.exists() && !!userDoc.data().username);
        } catch (error) {
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
