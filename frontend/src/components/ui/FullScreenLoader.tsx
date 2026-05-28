type FullScreenLoaderProps = {
  label?: string;
};

export function FullScreenLoader({
  label = "Autenticando entorno...",
}: FullScreenLoaderProps) {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center space-y-4">
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-gray-400 text-sm font-medium">{label}</p>
    </div>
  );
}
