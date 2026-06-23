import { Loader2 } from "lucide-react";

// MAIN COMPONENT

export default function AuthLoadingScreen() {
  // RENDER

  return (
    <main
      className="min-h-screen bg-[#0d0f14] flex flex-col items-center justify-center space-y-4"
      role="status"
      aria-live="polite"
    >
      <Loader2
        className="w-10 h-10 text-[#5ab4e8] animate-spin"
        aria-hidden="true"
      />
      <p className="text-white/50 text-sm font-medium tracking-wide">
        Autenticando entorno...
      </p>
    </main>
  );
}
