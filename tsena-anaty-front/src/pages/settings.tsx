import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

const profileSchema = z.object({
  email: z.string().email("Email invalide"),
  phone_numer: z.string().optional(),
  address: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

/** Page des paramètres (profil utilisateur) */
function SettingsPage() {
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      email: user?.email || "",
      phone_numer: user?.phone_numer || "",
      address: user?.address || "",
    },
  });

  const onSubmit = (_data: ProfileFormData) => {
    // TODO: Appeler l'API de mise à jour du profil
    toast.success("Profil mis à jour");
  };

  return (
    <div className="max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>Mon profil</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && (
                <p className="mt-1 text-xs text-danger">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="phone_numer">Téléphone</Label>
              <Input id="phone_numer" {...register("phone_numer")} />
            </div>

            <div>
              <Label htmlFor="address">Adresse</Label>
              <Input id="address" {...register("address")} />
            </div>

            <Button type="submit">Enregistrer</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default SettingsPage;
