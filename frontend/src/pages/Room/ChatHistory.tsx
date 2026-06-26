import { useEffect, useState, useRef } from "react";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";

import { db } from "../../config/firebase.ts";

// INTERFACES

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

interface MessageBubbleProps {
  message: Message;
  isMe: boolean;
}

// SUB-COMPONENTS

const MessageBubble = ({ message, isMe }: Readonly<MessageBubbleProps>) => {
  const displayName = isMe ? "Tú" : message.senderName;

  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg p-3 text-sm shadow-sm ${
          isMe
            ? "rounded-br-none bg-sky-600 text-white"
            : "rounded-bl-none border border-gray-700 bg-[#1E1E1E] text-gray-100"
        }`}
      >
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-sky-300">
          {displayName}
        </p>
        <p className="wrap-break-word">{message.text}</p>

        {message.timestamp && (
          <span
            className={`mt-1 block text-right text-[10px] ${
              isMe ? "text-blue-200" : "text-gray-400"
            }`}
          >
            {message.timestamp.toDate().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>
    </div>
  );
};

// MAIN COMPONENT

export default function ChatHistory({
  roomId,
  currentUserId,
}: Readonly<ChatHistoryProps>) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [prevRoomId, setPrevRoomId] = useState(roomId);

  if (roomId !== prevRoomId) {
    setPrevRoomId(roomId);
    setIsLoading(true);
    setHasError(false);
    setMessages([]);
  }

  // Fetching logic
  useEffect(() => {
    if (!roomId) return;

    const messagesRef = collection(db, "rooms", roomId, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"), limit(50));

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
        setIsLoading(false);
      },
      (err) => {
        console.error("Error al obtener el historial del chat:", err);
        setHasError(true);
        setIsLoading(false);
      },
    );

    return () => unsubscribe();
  }, [roomId]);

  // Automatic scrolling to the latest message when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  // HELPER RENDERING STATES

  const renderContent = () => {
    if (isLoading) {
      return (
        <div aria-busy="true" className="flex h-full flex-col space-y-4 p-4">
          <div className="flex max-w-[70%] animate-pulse space-x-3">
            <div className="h-8 w-8 shrink-0 rounded-full bg-gray-700" />
            <div className="h-10 flex-1 rounded-lg rounded-tl-none bg-gray-700" />
          </div>
          <div className="ml-auto flex max-w-[70%] justify-end space-x-3 animate-pulse">
            <div className="h-10 flex-1 rounded-lg rounded-tr-none bg-gray-700" />
            <div className="h-8 w-8 shrink-0 rounded-full bg-gray-700" />
          </div>
        </div>
      );
    }

    if (hasError) {
      return (
        <div
          role="alert"
          className="flex h-full flex-col items-center justify-center p-6 text-center"
        >
          <p className="mb-3 text-sm font-medium text-red-300">
            No se pudo conectar al chat.
          </p>
        </div>
      );
    }

    if (messages.length === 0) {
      return (
        <output className="flex h-full flex-col items-center justify-center p-8 text-center">
          <div className="mb-2 text-3xl" aria-hidden="true">
            💬
          </div>
          <p className="text-sm font-semibold text-gray-200">
            No hay mensajes aún
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Sé el primero en saludar.
          </p>
        </output>
      );
    }

    return (
      <div
        role="log"
        aria-live="polite"
        className="flex h-full flex-col overflow-y-auto p-4 text-gray-100"
      >
        <div className="flex-1 space-y-3">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isMe={message.senderId === currentUserId}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
    );
  };

  // RENDER

  return (
    <div className="h-full w-full overflow-hidden bg-[#121212]">
      {renderContent()}
    </div>
  );
}
