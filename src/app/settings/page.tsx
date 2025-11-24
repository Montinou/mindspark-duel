"use client";

import { useEffect, useState } from "react";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { UserProfileInput } from "@/types/profile";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfileInput | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch('/api/user/profile');

        if (response.status === 401) {
          // Not authenticated, redirect to home
          router.push('/');
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to load profile');
        }

        const data = await response.json();
        setProfile(data || {});
      } catch (err) {
        setError('Error al cargar el perfil');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400">Cargando perfil...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Configuración</h1>
              <p className="text-zinc-400 mt-1">
                Personaliza tu experiencia educativa
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors"
            >
              ← Volver al Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-2">
              Tu Perfil Educativo
            </h2>
            <p className="text-zinc-400">
              Esta información nos ayuda a generar problemas educativos personalizados
              según tu edad, nivel e intereses. Todos los campos son opcionales.
            </p>
          </div>

          <ProfileForm
            defaultValues={profile || undefined}
            onSuccess={() => {
              // Refresh the profile data after successful update
              fetch('/api/user/profile')
                .then(res => res.json())
                .then(data => setProfile(data))
                .catch(console.error);
            }}
          />
        </div>

        {/* Privacy Notice */}
        <div className="mt-8 p-6 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
          <h3 className="text-sm font-semibold text-zinc-300 mb-2">
            🔒 Privacidad y Seguridad
          </h3>
          <ul className="text-xs text-zinc-400 space-y-1">
            <li>• Solo almacenamos tu edad (no fecha de nacimiento completa)</li>
            <li>• Tus intereses se usan únicamente para personalizar problemas</li>
            <li>• No compartimos tu información con terceros</li>
            <li>• Puedes actualizar o eliminar tu perfil en cualquier momento</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
