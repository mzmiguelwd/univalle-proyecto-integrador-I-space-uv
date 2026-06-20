import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface TopBarProps {
  roomId: string;
  isOwner: boolean;
}

export default function TopBar({ roomId, isOwner }: TopBarProps) {
  const [hasCopiedId, setHasCopiedId] = useState(false);

  const copyRoomId = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      setHasCopiedId(true);
      setTimeout(() => setHasCopiedId(false), 2000);
    }
  };

  return (
    <div className="h-14 shrink-0 bg-[#121212] border-b border-gray-800 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm font-medium">
            ID de la Sala:
          </span>
          <div className="flex items-center bg-[#1A1A1A] border border-gray-700 rounded-lg px-3 py-1.5 gap-3">
            <span className="text-sky-300 font-mono text-sm tracking-wide">
              {roomId}
            </span>
            <button
              onClick={copyRoomId}
              className="text-gray-400 hover:text-white transition-colors"
              title="Copiar ID"
            >
              {hasCopiedId ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
        {isOwner && (
          <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
            Anfitrión
          </span>
        )}
      </div>
    </div>
  );
}
