import { Link } from "react-router-dom";
import { Rocket, LogIn, UserPlus } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-3xl w-full text-center space-y-10 z-10">
        <div className="space-y-6">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-gray-900 border border-gray-800 rounded-2xl shadow-xl">
              <Rocket className="w-12 h-12 text-blue-500" />
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-500 tracking-tight">
            Space-UV
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto font-light">
            El entorno de estudio colaborativo diseñado para potenciar tu
            rendimiento académico. Conéctate, sincroniza y construye
            conocimiento en tiempo real.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            to="/register"
            className="w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-8 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-900/20 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-950 transition-all"
          >
            <UserPlus className="w-5 h-5" />
            Crear cuenta
          </Link>

          <Link
            to="/login"
            className="w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-8 rounded-xl font-medium text-gray-300 bg-gray-900 border border-gray-700 hover:bg-gray-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-950 transition-all"
          >
            <LogIn className="w-5 h-5" />
            Iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
