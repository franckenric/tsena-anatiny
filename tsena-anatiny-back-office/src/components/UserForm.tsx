import { useState } from "react";
import type { User, CreateUserPayload, UpdateUserPayload } from "../types/user";
import type { Role } from "../types/role";
import { Input, Button, Select } from "./index";

interface UserFormProps {
  user?: User;
  roles: Role[];
  onSubmit: (payload: CreateUserPayload | UpdateUserPayload) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function UserForm({
  user,
  roles,
  onSubmit,
  onCancel,
  isLoading = false
}: UserFormProps) {
  const [formData, setFormData] = useState<CreateUserPayload>(
    user
      ? {
          email: user.email,
          phone_numer: user.phone_numer,
          password: "",
          role_id: user.role_id,
          is_active: user.is_active,
          full_name: user.full_name || ""
        }
      : {
          email: "",
          phone_numer: "",
          password: "",
          role_id: 1,
          is_active: true
        }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (
    field: keyof CreateUserPayload,
    value: string | number | boolean
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email est requis";
    } else if (!formData.email.includes("@")) {
      newErrors.email = "Email invalide";
    }

    if (!formData.phone_numer.trim()) {
      newErrors.phone_numer = "Téléphone est requis";
    }

    if (!user && !formData.password.trim()) {
      newErrors.password = "Mot de passe est requis";
    }

    if (formData.password && formData.password.length < 6) {
      newErrors.password = "Mot de passe doit contenir au moins 6 caractères";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const payload = user
      ? {
          email: formData.email,
          phone_numer: formData.phone_numer,
          role_id: formData.role_id,
          is_active: formData.is_active,
          full_name: formData.full_name,
          ...(formData.password && { password: formData.password })
        }
      : formData;

    try {
      await onSubmit(payload);
    } catch (err) {
      setErrors({
        submit: err instanceof Error ? err.message : "Erreur lors de l'envoi"
      });
    }
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {errors.submit && (
        <div className="rounded-xl border border-warning/50 bg-warning/10 px-3 py-2.5 text-sm text-ink">
          {errors.submit}
        </div>
      )}

      <Input
        label="Email"
        type="email"
        value={formData.email}
        onChange={(e) => handleChange("email", e.target.value)}
        error={errors.email}
        placeholder="email@example.com"
        disabled={isLoading}
      />

      <Input
        label="Téléphone"
        type="text"
        value={formData.phone_numer}
        onChange={(e) => handleChange("phone_numer", e.target.value)}
        error={errors.phone_numer}
        placeholder="+261 34 00 000 00"
        disabled={isLoading}
      />

      <Input
        label="Nom complet"
        type="text"
        value={formData.full_name || ""}
        onChange={(e) => handleChange("full_name", e.target.value)}
        placeholder="Votre nom complet"
        disabled={isLoading}
      />

      <Select
        label="Rôle"
        value={String(formData.role_id)}
        onValueChange={(value) => handleChange("role_id", parseInt(value))}
        options={roles.map((role) => ({
          label: role.name,
          value: String(role.id)
        }))}
        disabled={isLoading}
      />

      <div className="space-y-1.5">
        <label
          htmlFor="is-active"
          className="block text-sm font-semibold text-ink"
        >
          Actif
        </label>
        <label
          htmlFor="is-active"
          className="inline-flex cursor-pointer items-center gap-3"
        >
          <span className="text-sm text-muted">
            {formData.is_active ? "Compte actif" : "Compte inactif"}
          </span>
          <span className="relative inline-flex h-7 w-12 items-center">
            <input
              id="is-active"
              type="checkbox"
              className="peer sr-only"
              checked={formData.is_active}
              onChange={(e) => handleChange("is_active", e.target.checked)}
              disabled={isLoading}
            />
            <span className="absolute inset-0 rounded-full bg-border transition peer-checked:bg-success peer-disabled:opacity-60" />
            <span className="absolute left-1 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
          </span>
        </label>
      </div>

      <Input
        label={user ? "Nouveau mot de passe (optionnel)" : "Mot de passe"}
        type="password"
        value={formData.password}
        onChange={(e) => handleChange("password", e.target.value)}
        error={errors.password}
        placeholder="••••••••"
        disabled={isLoading}
      />

      <div className="flex gap-3 pt-4">
        <Button
          type="submit"
          isLoading={isLoading}
          disabled={isLoading}
          variant="primary"
          className="flex-1"
        >
          {user ? "Mettre à jour" : "Créer"}
        </Button>
        <Button
          type="button"
          onClick={onCancel}
          variant="secondary"
          className="flex-1"
          disabled={isLoading}
        >
          Annuler
        </Button>
      </div>
    </form>
  );
}
