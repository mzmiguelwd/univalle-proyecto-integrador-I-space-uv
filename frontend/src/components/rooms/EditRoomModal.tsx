import { useEffect, useState } from "react";
import { updateStudyRoom, type StudyRoom } from "../../config/rooms";
import { X, Loader2 } from "lucide-react";

interface Props {
  room: StudyRoom;
  isOpen: boolean;
  onClose: () => void;
}

export default function EditRoomModal({ room, isOpen, onClose }: Props) {
  const [formData, setFormData] = useState({
    title: "",
    topic: "",
    limit: "",
    privacy: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (room) {
      setFormData({
        title: room.title || "",
        topic: room.topic || "",
        limit: (room.limit ?? 1).toString(), // Aquí el ?? evita el error si es null/undefined
        privacy: room.privacy || "Pública",
      });
    }
  }, [room]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      await updateStudyRoom(room.id, {
        title: formData.title,
        topic: formData.topic,
        limit: parseInt(formData.limit) || 1,
        privacy: formData.privacy,
      });
      onClose();
    } catch (error) {
      console.error("Error al editar:", error);
      alert("Hubo un error al actualizar la sala.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#1C1C1C] border border-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-sky-300">Editar Sala</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-white"
          />
          <textarea
            value={formData.topic}
            onChange={(e) =>
              setFormData({ ...formData, topic: e.target.value })
            }
            className="w-full bg-[#121212] border border-gray-700 rounded-lg p-3 text-white"
            rows={3}
          />
          <button
            disabled={isLoading}
            className="w-full bg-sky-300 text-sky-950 font-bold py-3 rounded-lg mt-4"
          >
            {isLoading ? (
              <Loader2 className="animate-spin mx-auto" />
            ) : (
              "Guardar Cambios"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
