import { LoginForm } from "@/components/login-form";

function LoginPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 via-background to-amber-100/50 p-6 md:p-10">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-5xl items-center">
        <div className="grid w-full overflow-hidden rounded-2xl border border-border/70 bg-background/90 shadow-2xl backdrop-blur md:grid-cols-2">
          <section className="hidden flex-col justify-between bg-gradient-to-br from-primary/95 to-orange-700 p-10 text-primary-foreground md:flex">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] opacity-90">
                Tsena Back Office
              </p>
              <h1 className="mt-4 text-3xl font-semibold leading-tight">
                Pilotez vos ventes, vos produits et votre stock.
              </h1>
              <p className="mt-4 max-w-sm text-sm opacity-90">
                Un espace centralise pour les commerciaux et les
                administrateurs.
              </p>
            </div>
            <p className="text-xs opacity-80">
              Version interne - acces securise
            </p>
          </section>

          <section className="flex items-center p-6 sm:p-10">
            <LoginForm className="mx-auto max-w-md" />
          </section>
        </div>
      </div>
    </main>
  );
}

export default LoginPage;
