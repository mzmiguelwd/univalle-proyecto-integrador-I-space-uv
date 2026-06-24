import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Send, Loader2 } from "lucide-react";

import { auth, db } from "../../config/firebase.ts";
import type { UserProfile } from "../../config/auth.ts";

import ChatHistory from "./ChatHistory.tsx";

// INTERFACES

interface ChatPanelProps {
  roomId: string;
  profile: UserProfile;
}

// MAIN COMPONENT

export default function ChatPanel({
  roomId,
  profile,
}: Readonly<ChatPanelProps>) {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Handles the form submission to send a new message to Firestore.
   * Includes optimistic UI clearing and fallback restoration on error.
   */
  const handleSendMessage = async (
    event?: React.SubmitEvent<HTMLFormElement>,
  ) => {
    // Prevent default form behavior (page reload)
    if (event) event.preventDefault();

    const cleanText = message.trim().replace(/[<>]/g, "");

    // Guard clause to prevent empty submissions or unauthorized access
    if (!roomId || !cleanText || !auth.currentUser || isSubmitting) return;

    setIsSubmitting(true);

    // Store backup in case the network request fails
    const backupMessage = message;
    setMessage("");

    try {
      await addDoc(collection(db, "rooms", roomId, "messages"), {
        text: cleanText,
        senderId: auth.currentUser.uid,
        senderName: profile.name || profile.username || "Usuario",
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error al enviar el mensaje:", error);
      // Restore user input so they don't lose their typed message
      setMessage(backupMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isInputEmpty = message.trim().length === 0;

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-gray-800 bg-[#121212]">
      {/* HEADER */}
      <header className="flex shrink-0 items-center justify-between border-b border-gray-800 p-4">
        <h3 className="font-mono text-sm font-bold text-gray-300">
          Chat de la Sala
        </h3>
      </header>

      {/* CHAT HISTORY */}
      <div className="flex-1 overflow-hidden">
        <ChatHistory
          roomId={roomId}
          currentUserId={auth.currentUser?.uid ?? ""}
        />
      </div>

      {/* INPUT AREA */}
      <div className="shrink-0 p-3">
        <form
          onSubmit={handleSendMessage}
          className="flex items-center rounded-xl border border-gray-700 bg-[#1E1E1E] pr-2 transition-all focus-within:border-sky-500/50 focus-within:ring-1 focus-within:ring-sky-500/50"
        >
          <input
            type="text"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            disabled={isSubmitting}
            placeholder="Escribe un mensaje..."
            aria-label="Escribir mensaje de chat"
            className="flex-1 bg-transparent px-3 py-2 text-white outline-none disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={isInputEmpty || isSubmitting}
            aria-label="Enviar mensaje"
            className="p-2 text-sky-400 transition-colors hover:text-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:cursor-not-allowed disabled:text-gray-600 rounded-lg"
          >
            {isSubmitting ? (
              <Loader2 size={20} className="animate-spin" aria-hidden="true" />
            ) : (
              <Send size={20} aria-hidden="true" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
