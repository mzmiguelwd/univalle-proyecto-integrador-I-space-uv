import React, { useEffect, useState, useRef } from "react";
import { db } from "../../config/firebase";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";

// Interfaz para tipar los mensajes de Firestore
interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: Timestamp | null;
}

interface ChatHistoryProps {
  roomId: string;
  currentUserId: string;
}

const ChatHistory: React.FC<ChatHistoryProps> = ({ roomId, currentUserId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Función principal para recuperar el historial (US11)
  useEffect(() => {
    if (!roomId) return;

    setLoading(true);
    setError(false);

    const messagesRef = collection(db, "rooms", roomId, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"), limit(50));

    // onSnapshot detecta cambios instantáneamente
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedMessages: Message[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            text: data.text || "",
            senderId: data.senderId || "",
            senderName: data.senderName || "Usuario",
            timestamp: data.timestamp || null,
          };
        });

        setMessages(fetchedMessages);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching chat history:", err);
        setError(true);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [roomId]);

  useEffect(() => {
    if (!loading && !error && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, error]);

  // ==========================================
  // RENDERIZADO POR ESTADOS DE LA US11 (UX/HCI)
  // ==========================================

  // 1. ESTADO: Cargando (Bubbles/Skeleton Loaders animados)
  if (loading) {
    return (
      <div className="flex flex-col space-y-4 p-4 bg-[#121212] h-full overflow-hidden">
        {/* Skeletons de carga */}
        <div className="animate-pulse flex space-x-3 max-w-[70%]">
          <div className="rounded-full bg-gray-700 h-8 w-8 shrink-0"></div>
          <div className="flex-1 bg-gray-700 h-10 rounded-lg rounded-tl-none"></div>
        </div>
        <div className="animate-pulse flex space-x-3 max-w-[70%] ml-auto justify-end">
          <div className="flex-1 bg-gray-700 h-10 rounded-lg rounded-tr-none"></div>
          <div className="rounded-full bg-gray-700 h-8 w-8 shrink-0"></div>
        </div>
      </div>
    );
  }

  // 2. ESTADO: Error (Fallo de red o consulta bloqueada)
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-6 h-full text-center">
        <p className="text-red-300 font-medium mb-3 text-sm">
          No se pudo conectar al chat.
        </p>
      </div>
    );
  }

  // 3. ESTADO: Vacío (Firestore retorna []) -> Escenario 2
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-full text-center">
        <div className="text-3xl mb-2">💬</div>
        <p className="text-gray-200 font-semibold text-sm">
          No hay mensajes aún
        </p>
        <p className="text-gray-500 text-xs mt-1">Sé el primero en saludar.</p>
      </div>
    );
  }

  // 4. ESTADO: Éxito (Historial renderizado correctamente)
  return (
    <div className="flex flex-col h-full p-4 overflow-y-auto text-gray-100">
      <div className="flex-1 space-y-3">
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUserId;
          const displayName = isMe ? "Tú" : msg.senderName;

          return (
            <div
              key={msg.id}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`p-3 rounded-lg max-w-[85%] shadow-sm text-sm ${
                  isMe
                    ? "bg-sky-600 text-white rounded-br-none"
                    : "bg-[#1E1E1E] text-gray-100 rounded-bl-none border border-gray-700"
                }`}
              >
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-sky-300">
                  {displayName}
                </p>
                <p className="break-words">{msg.text}</p>
                {msg.timestamp && (
                  <span
                    className={`block text-[10px] mt-1 text-right ${isMe ? "text-blue-200" : "text-gray-400"}`}
                  >
                    {msg.timestamp.toDate().toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default ChatHistory;
