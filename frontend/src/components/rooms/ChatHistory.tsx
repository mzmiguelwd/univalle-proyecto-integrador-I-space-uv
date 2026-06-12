import React, { useCallback, useEffect, useState, useRef } from "react";
import { db } from "../../config/firebase";
import {
  doc,
  collection,
  getDoc,
  query,
  orderBy,
  limit,
  getDocs,
  Timestamp,
} from "firebase/firestore";

// Interfaz para tipar los mensajes de Firestore
interface Message {
  id: string;
  text: string;
  userId: string;
  createdAt: Timestamp | null;
}

type SenderMap = Record<string, string>;

interface ChatHistoryProps {
  roomId: string;
  currentUserId: string;
}

const ChatHistory: React.FC<ChatHistoryProps> = ({ roomId, currentUserId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [senderNames, setSenderNames] = useState<SenderMap>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Función principal para recuperar el historial (US11)
  const fetchChatHistory = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      // Ruta dinámica basada en la sala seleccionada
      const messagesRef = collection(db, "rooms", roomId, "messages");

      // Escenario 1 y 3: Ordenados cronológicamente y limitado a un máximo de 50
      const q = query(messagesRef, orderBy("createdAt", "asc"), limit(50));

      const querySnapshot = await getDocs(q);
      const fetchedMessages: Message[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedMessages.push({
          id: doc.id,
          text: data.text || "",
          userId: data.userId || "",
          createdAt: data.createdAt || null,
        });
      });

      setMessages(fetchedMessages);

      const uniqueUserIds = Array.from(
        new Set(
          fetchedMessages
            .map((message) => message.userId)
            .filter((userId) => Boolean(userId)),
        ),
      );

      const userProfiles = await Promise.all(
        uniqueUserIds.map(async (userId) => {
          const userSnap = await getDoc(doc(db, "users", userId));
          const profile = userSnap.exists() ? userSnap.data() : null;
          const displayName =
            profile?.name ||
            profile?.originalUsername ||
            profile?.username ||
            "Usuario";

          return [userId, displayName] as const;
        }),
      );

      setSenderNames(Object.fromEntries(userProfiles));
    } catch (err) {
      console.error("Error fetching chat history:", err);
      setError(true); // Activa el estado de Error UX
    } finally {
      setLoading(false); // Finaliza el estado Cargando UX
    }
  }, [roomId]);

  // Inicializa la consulta al montar el componente o cambiar de sala
  useEffect(() => {
    if (!roomId) return;

    let isActive = true;

    queueMicrotask(() => {
      if (isActive) {
        void fetchChatHistory();
      }
    });

    return () => {
      isActive = false;
    };
  }, [roomId, fetchChatHistory]);

  // Escenario 1: Ajustar el scroll al final de la lista de manera inmediata tras el renderizado exitoso
  useEffect(() => {
    if (!loading && !error && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [messages, loading, error]);

  // ==========================================
  // RENDERIZADO POR ESTADOS DE LA US11 (UX/HCI)
  // ==========================================

  // 1. ESTADO: Cargando (Bubbles/Skeleton Loaders animados)
  if (loading) {
    return (
      <div className="flex flex-col space-y-4 p-4 bg-[#121212] h-96 overflow-hidden">
        <div className="animate-pulse flex space-x-3 max-w-[70%]">
          <div className="rounded-full bg-gray-700 h-8 w-8"></div>
          <div className="flex-1 bg-gray-700 h-10 rounded-lg rounded-tl-none"></div>
        </div>
        <div className="animate-pulse flex space-x-3 max-w-[70%] ml-auto justify-end">
          <div className="flex-1 bg-gray-700 h-10 rounded-lg rounded-tr-none"></div>
          <div className="rounded-full bg-gray-700 h-8 w-8"></div>
        </div>
        <div className="animate-pulse flex space-x-3 max-w-[60%]">
          <div className="rounded-full bg-gray-700 h-8 w-8"></div>
          <div className="flex-1 bg-gray-700 h-10 rounded-lg rounded-tl-none"></div>
        </div>
        <p className="text-center text-xs text-gray-500 font-medium animate-pulse">
          Fetching history...
        </p>
      </div>
    );
  }

  // 2. ESTADO: Error (Fallo de red o consulta bloqueada)
  if (error) {
    console.error("ERRORE:", error);
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-[#1A1A1A] border border-red-900/40 rounded-lg h-96">
        <p className="text-red-300 font-medium mb-3 text-sm text-center">
          No se pudo cargar el historial.
        </p>

        <button
          onClick={fetchChatHistory}
          className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold py-2 px-4 rounded shadow transition"
        >
          Reintentar
        </button>
      </div>
    );
  }

  // 3. ESTADO: Vacío (Firestore retorna []) -> Escenario 2
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-[#121212] rounded-lg h-96 text-center border border-gray-800">
        <div className="text-3xl mb-2">💬</div>
        <p className="text-gray-200 font-semibold text-sm">
          No hay mensajes aún
        </p>
        <p className="text-gray-500 text-xs mt-1">
          Sé el primero en enviar un mensaje en esta sala.
        </p>
      </div>
    );
  }

  // 4. ESTADO: Éxito (Historial renderizado correctamente)
  return (
    <div className="flex flex-col h-96 p-4 bg-[#121212] border border-gray-800 rounded-lg overflow-y-auto text-gray-100">
      <div className="flex-1 space-y-3">
        {messages.map((msg) => {
          const isMe = msg.userId === currentUserId;
          const senderName = isMe ? "Tú" : senderNames[msg.userId] || "Usuario";
          return (
            <div
              key={msg.id}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`p-3 rounded-lg max-w-[75%] shadow-sm text-sm ${
                  isMe
                    ? "bg-sky-600 text-white rounded-br-none"
                    : "bg-[#1E1E1E] text-gray-100 rounded-bl-none border border-gray-700"
                }`}
              >
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-sky-300">
                  {senderName}
                </p>
                <p className="wrap-break-word">{msg.text}</p>
                {msg.createdAt && (
                  <span
                    className={`block text-[10px] mt-1 text-right ${isMe ? "text-blue-200" : "text-gray-400"}`}
                  >
                    {msg.createdAt.toDate().toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        {/* Referencia técnica invisible para forzar el scroll final */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default ChatHistory;
