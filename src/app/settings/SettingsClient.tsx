'use client';

import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStackApp } from "@stackframe/stack";
import { useState } from "react";
import { toast } from "sonner";
import { LogOut, User, Mail, Shield } from "lucide-react";

interface SettingsClientProps {
  user: any;
}

export function SettingsClient({ user }: SettingsClientProps) {
  const app = useStackApp();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await app.signOut();
      toast.success("Sesión cerrada exitosamente");
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error("Error al cerrar sesión");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Configuración
          </h1>
          <p className="text-zinc-400 mt-2">Administra tu cuenta y preferencias</p>
        </div>

        {/* User Profile Card */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Perfil de Usuario
            </CardTitle>
            <CardDescription>Información de tu cuenta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-zinc-300">Nombre de Usuario</Label>
              <Input
                id="displayName"
                value={user.displayName || "Sin nombre"}
                disabled
                className="bg-zinc-800/50 border-zinc-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-300 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Correo Electrónico
              </Label>
              <Input
                id="email"
                type="email"
                value={user.primaryEmail || "Sin correo"}
                disabled
                className="bg-zinc-800/50 border-zinc-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="userId" className="text-zinc-300 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                ID de Usuario
              </Label>
              <Input
                id="userId"
                value={user.id}
                disabled
                className="bg-zinc-800/50 border-zinc-700 text-white font-mono text-xs"
              />
            </div>
          </CardContent>
        </Card>

        {/* Account Actions Card */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle>Acciones de Cuenta</CardTitle>
            <CardDescription>Administra tu sesión</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleSignOut}
              disabled={isLoading}
              variant="destructive"
              className="w-full sm:w-auto flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              {isLoading ? "Cerrando sesión..." : "Cerrar Sesión"}
            </Button>
          </CardContent>
        </Card>

        {/* Game Settings Card */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle>Configuración del Juego</CardTitle>
            <CardDescription>Personaliza tu experiencia de juego</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-zinc-400">
              Próximamente: Preferencias de notificaciones, idioma, y más...
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
