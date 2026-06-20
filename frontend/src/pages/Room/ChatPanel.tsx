import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../config/firebase";
import { Send } from "lucide-react";
import type { UserProfile } from "../../config/auth";

import ChatHistory from "./ChatHistory.tsx";

interface ChatPanelProps {
  roomId: string;
  profile: UserProfile;
}

export default function ChatPanel({ roomId, profile }: ChatPanelProps) {
  const [message, setMessage] = useState("");

  const handleSendMessage = async () => {
    const cleanText = message.trim().replace(/[<>]/g, "");
    if (!roomId || !cleanText || !auth.currentUser) return;

    setMessage("");

    try {
      await addDoc(collection(db, "rooms", roomId, "messages"), {
        text: cleanText,
        senderId: auth.currentUser.uid,
        senderName: profile.name || profile.username || "Usuario",
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error enviando mensaje:", error);
    }
  };

  return (
    <div className="flex-1 bg-[#121212] rounded-2xl border border-gray-800 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-gray-800 flex justify-between items-center shrink-0">
        <h3 className="font-mono text-sm font-bold text-gray-300">
          Chat de la Sala
        </h3>
      </div>

      {/* Historial de mensajes (el componente que ya optimizamos) */}
      <div className="flex-1 overflow-hidden">
        <ChatHistory
          roomId={roomId}
          currentUserId={auth.currentUser?.uid || ""}
        />
      </div>

      {/* Input y botón de envío */}
      <div className="p-3 shrink-0">
        <div className="bg-[#1E1E1E] border border-gray-700 rounded-xl flex items-center pr-2">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Escribe un mensaje..."
            aria-label="Mensaje de chat"
            className="flex-1 bg-transparent text-white rounded-lg px-3 py-2 outline-none"
          />
          <button
            type="button"
            onClick={handleSendMessage}
            aria-label="Enviar mensaje"
            className="p-2 text-sky-400 hover:text-sky-300 transition-colors"
          >
            <Send size={20} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
