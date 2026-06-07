import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { User } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const commercialSchema = z.object({
  email: z.string().email("Adresse email invalide"),
  password: z
    .string()
    .min(6, "Minimum 6 caractères")
    .optional()
    .or(z.literal("")),
  phone_numer: z.string().min(10, "Numéro de téléphone invalide"),
  address: z.string().optional(),
  is_active: z.enum(["true", "false"]),
});

type CommercialFormData = z.infer<typeof commercialSchema>;

type CommercialFormProps = {
  commercial?: User | null;
  onSubmit: (data: CommercialFormData) => void;
  isLoading?: boolean;
};

/** Formulaire de création/modification d'un commercial */
function CommercialForm({
  commercial,
  onSubmit,
  isLoading,
}: CommercialFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CommercialFormData>({
    resolver: zodResolver(commercialSchema),
    defaultValues: {
      email: commercial?.email || "",
      password: "",
      phone_numer: commercial?.phone_numer || "",
      address: commercial?.address || "",
      is_active: commercial?.is_active === false ? "false" : "true",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          {...register("email")}
          placeholder="email@example.com"
        />
        {errors.email && (
          <p className="mt-1 text-xs text-danger">{errors.email.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="phone_numer">Téléphone</Label>
        <Input
          id="phone_numer"
          {...register("phone_numer")}
          placeholder="Ex: 0341234567"
        />
        {errors.phone_numer && (
          <p className="mt-1 text-xs text-danger">
            {errors.phone_numer.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="password">
          {commercial
            ? "Nouveau mot de passe (laisser vide pour garder)"
            : "Mot de passe"}
        </Label>
        <Input
          id="password"
          type="password"
          {...register("password")}
          placeholder="••••••"
        />
        {errors.password && (
          <p className="mt-1 text-xs text-danger">{errors.password.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="address">Adresse</Label>
        <Input
          id="address"
          {...register("address")}
          placeholder="Adresse (optionnel)"
        />
      </div>

      <div>
        <Label htmlFor="is_active">Statut</Label>
        <Select id="is_active" {...register("is_active")}>
          <option value="true">Actif</option>
          <option value="false">Inactif</option>
        </Select>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading
          ? "Enregistrement..."
          : commercial
            ? "Modifier"
            : "Créer le commercial"}
      </Button>
    </form>
  );
}

export { CommercialForm };
