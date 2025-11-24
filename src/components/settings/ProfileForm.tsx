"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { userProfileSchema, type UserProfileInput, educationLevels, interestCategories } from "@/types/profile";
import { useState } from "react";

interface ProfileFormProps {
  defaultValues?: UserProfileInput;
  onSuccess?: () => void;
}

export function ProfileForm({ defaultValues, onSuccess }: ProfileFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UserProfileInput>({
    resolver: zodResolver(userProfileSchema),
    defaultValues: defaultValues || {
      age: undefined,
      educationLevel: undefined,
      interests: [],
      preferredDifficulty: 5,
    },
  });

  const selectedInterests = watch("interests") || [];

  const toggleInterest = (interest: typeof interestCategories[number]) => {
    const current = selectedInterests;
    if (current.includes(interest)) {
      setValue("interests", current.filter((i) => i !== interest));
    } else if (current.length < 5) {
      setValue("interests", [...current, interest]);
    }
  };

  const onSubmit = async (data: UserProfileInput) => {
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: '✅ Perfil actualizado exitosamente' });
        onSuccess?.();
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: `❌ Error: ${error.error || 'No se pudo actualizar el perfil'}` });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '❌ Error de conexión' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      {/* Age */}
      <div>
        <label htmlFor="age" className="block text-sm font-medium text-zinc-200 mb-2">
          Edad (opcional)
        </label>
        <input
          id="age"
          type="number"
          min={5}
          max={99}
          {...register("age", { valueAsNumber: true })}
          className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Ej: 14"
        />
        {errors.age && (
          <p className="text-red-400 text-sm mt-1">{errors.age.message}</p>
        )}
        <p className="text-zinc-400 text-xs mt-1">
          Tu edad nos ayuda a generar problemas apropiados (5-99 años)
        </p>
      </div>

      {/* Education Level */}
      <div>
        <label htmlFor="educationLevel" className="block text-sm font-medium text-zinc-200 mb-2">
          Nivel Educativo (opcional)
        </label>
        <select
          id="educationLevel"
          {...register("educationLevel")}
          className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Selecciona tu nivel</option>
          <option value="elementary">Primaria (5-11 años)</option>
          <option value="middle">Secundaria (12-14 años)</option>
          <option value="high">Preparatoria (15-18 años)</option>
          <option value="college">Universidad (18+ años)</option>
          <option value="other">Otro</option>
        </select>
        {errors.educationLevel && (
          <p className="text-red-400 text-sm mt-1">{errors.educationLevel.message}</p>
        )}
      </div>

      {/* Interests */}
      <div>
        <label className="block text-sm font-medium text-zinc-200 mb-2">
          Intereses (selecciona hasta 5)
        </label>
        <div className="grid grid-cols-2 gap-3">
          {interestCategories.map((interest) => {
            const isSelected = selectedInterests.includes(interest);
            const isDisabled = !isSelected && selectedInterests.length >= 5;

            return (
              <button
                key={interest}
                type="button"
                onClick={() => toggleInterest(interest)}
                disabled={isDisabled}
                className={`
                  px-4 py-2 rounded-lg border text-sm font-medium transition-colors
                  ${isSelected
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : isDisabled
                    ? 'bg-zinc-900 border-zinc-700 text-zinc-500 cursor-not-allowed'
                    : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-blue-500 hover:text-blue-400'
                  }
                `}
              >
                {interest.charAt(0).toUpperCase() + interest.slice(1)}
              </button>
            );
          })}
        </div>
        <p className="text-zinc-400 text-xs mt-2">
          Usaremos tus intereses para crear problemas más relevantes ({selectedInterests.length}/5 seleccionados)
        </p>
        {errors.interests && (
          <p className="text-red-400 text-sm mt-1">{errors.interests.message}</p>
        )}
      </div>

      {/* Preferred Difficulty */}
      <div>
        <label htmlFor="preferredDifficulty" className="block text-sm font-medium text-zinc-200 mb-2">
          Dificultad Preferida: {watch("preferredDifficulty") || 5}
        </label>
        <input
          id="preferredDifficulty"
          type="range"
          min={1}
          max={10}
          {...register("preferredDifficulty", { valueAsNumber: true })}
          className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <div className="flex justify-between text-xs text-zinc-400 mt-1">
          <span>Fácil (1)</span>
          <span>Medio (5)</span>
          <span>Difícil (10)</span>
        </div>
        {errors.preferredDifficulty && (
          <p className="text-red-400 text-sm mt-1">{errors.preferredDifficulty.message}</p>
        )}
      </div>

      {/* Message */}
      {message && (
        <div
          className={`px-4 py-3 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-900/30 border border-green-700 text-green-300'
              : 'bg-red-900/30 border border-red-700 text-red-300'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
      >
        {isSubmitting ? 'Guardando...' : 'Guardar Perfil'}
      </button>
    </form>
  );
}
