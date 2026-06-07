import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { authApi } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { AlertCircle, Loader2 } from "lucide-react";

interface LoginFormProps extends React.ComponentProps<"div"> {
  onSuccess?: () => void;
}

interface ValidationErrors {
  username?: string;
  password?: string;
}

export function LoginForm({ className, onSuccess, ...props }: LoginFormProps) {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!username.trim()) {
      newErrors.username = "L'email est requis";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username)) {
      newErrors.username = "Format d'email invalide";
    }

    if (!password) {
      newErrors.password = "Le mot de passe est requis";
    } else if (password.length < 6) {
      newErrors.password =
        "Le mot de passe doit contenir au moins 6 caractères";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      setErrors({});

      const response = await authApi.login({
        username: username.trim(),
        password,
      });

      await login(response.access_token);
      toast.success("Connexion réussie", {
        description: "Vous allez être redirigé...",
        duration: 3000,
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      onSuccess?.() || navigate("/", { replace: true });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Email ou mot de passe invalide";

      toast.error(message, {
        description: "Veuillez vérifier vos identifiants",
        icon: <AlertCircle className="h-4 w-4" />,
      });

      // Clear password on failed attempt for security
      setPassword("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange =
    (setter: (value: string) => void, field: keyof ValidationErrors) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setter(event.target.value);
      // Clear error when user starts typing
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    };

  return (
    <div className={cn("flex w-full flex-col gap-6", className)} {...props}>
      <Card className="border-border/60 bg-card/95 shadow-xl backdrop-blur-sm">
        <CardHeader className="space-y-2 text-center sm:text-left">
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Connexion au back-office
          </CardTitle>
          <CardDescription className="text-sm">
            Connectez-vous avec votre compte commercial ou administrateur
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="username" className="required">
                  Email
                </FieldLabel>
                <Input
                  id="username"
                  type="email"
                  placeholder="nom@entreprise.mg"
                  value={username}
                  onChange={handleInputChange(setUsername, "username")}
                  disabled={isSubmitting}
                  autoComplete="username"
                  aria-invalid={!!errors.username}
                  aria-describedby={
                    errors.username ? "username-error" : undefined
                  }
                  className={cn(errors.username && "border-destructive")}
                />
                {errors.username && (
                  <FieldError id="username-error" role="alert">
                    {errors.username}
                  </FieldError>
                )}
              </Field>

              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="password" className="required">
                    Mot de passe
                  </FieldLabel>
                  <button
                    type="button"
                    onClick={() => {
                      // Add forgot password functionality here
                      toast.info("Fonctionnalité à venir");
                    }}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                    tabIndex={-1}
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={handleInputChange(setPassword, "password")}
                  disabled={isSubmitting}
                  autoComplete="current-password"
                  aria-invalid={!!errors.password}
                  aria-describedby={
                    errors.password ? "password-error" : undefined
                  }
                  className={cn(errors.password && "border-destructive")}
                />
                {errors.password && (
                  <FieldError id="password-error" role="alert">
                    {errors.password}
                  </FieldError>
                )}
              </Field>

              <Field className="pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full"
                  size="lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connexion en cours...
                    </>
                  ) : (
                    "Se connecter"
                  )}
                </Button>
              </Field>
            </FieldGroup>
          </form>

          <FieldDescription className="text-center text-xs text-muted-foreground">
            <AlertCircle className="inline h-3 w-3 mr-1" />
            L'accès est réservé au personnel autorisé.
          </FieldDescription>
        </CardContent>
      </Card>
    </div>
  );
}
