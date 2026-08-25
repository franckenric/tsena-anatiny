import { useEffect, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type {
  CreateCustomerPayload,
  UpdateCustomerPayload
} from "../types/customer";
import { customersService } from "../services/customers.service";
import { Input, Layout, FloatingActionButton } from "../components/index";

const PHONE_FORMAT_REGEX = /^\+261\s\d{2}\s\d{2}\s\d{3}\s\d{2}$/;
const PHONE_PREFIX = "+261 ";

const formatPhoneMadagascar = (value: string): string => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return PHONE_PREFIX;

  const localDigits = digits.startsWith("261") ? digits.slice(3) : digits;
  const limited = localDigits.slice(0, 9);

  const p1 = limited.slice(0, 2);
  const p2 = limited.slice(2, 4);
  const p3 = limited.slice(4, 7);
  const p4 = limited.slice(7, 9);

  const grouped = [p1, p2, p3, p4].filter(Boolean).join(" ");
  return grouped ? `${PHONE_PREFIX}${grouped}` : PHONE_PREFIX;
};

const isPhonePrefixOnly = (value: string): boolean =>
  value.trim() === PHONE_PREFIX.trim();

export function CustomerFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const history = useHistory();
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: "",
    phone: PHONE_PREFIX,
    delivery_address: ""
  });

  useEffect(() => {
    if (!isEdit) return;
    customersService
      .getCustomers(1, 1000)
      .then((r) => r.items.find((c) => c.id === Number(id)))
      .then((customer) => {
        if (!customer) {
          setErrors({ submit: "Client introuvable" });
          return;
        }
        setForm({
          name: customer.name ?? "",
          phone: formatPhoneMadagascar(customer.phone ?? ""),
          delivery_address: customer.delivery_address ?? ""
        });
      })
      .catch(() => setErrors({ submit: "Erreur chargement" }))
      .finally(() => setIsLoading(false));
  }, [id, isEdit]);

  const guardPhonePrefix = (input: HTMLInputElement) => {
    const start = input.selectionStart ?? PHONE_PREFIX.length;
    const end = input.selectionEnd ?? PHONE_PREFIX.length;
    if (start < PHONE_PREFIX.length || end < PHONE_PREFIX.length) {
      requestAnimationFrame(() => {
        input.setSelectionRange(PHONE_PREFIX.length, PHONE_PREFIX.length);
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const normalizedPhone = form.phone.trim();

    if (!form.name.trim()) errs.name = "Nom requis";
    if (!normalizedPhone || isPhonePrefixOnly(form.phone)) {
      errs.phone = "Téléphone requis";
    }
    if (
      normalizedPhone &&
      !isPhonePrefixOnly(form.phone) &&
      !PHONE_FORMAT_REGEX.test(normalizedPhone)
    ) {
      errs.phone = "Format attendu: +261 XX XX XXX XX";
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        name: form.name.trim(),
        phone: normalizedPhone,
        delivery_address: form.delivery_address.trim() || undefined
      } as CreateCustomerPayload | UpdateCustomerPayload;
      if (isEdit) {
        await customersService.updateCustomer(Number(id), payload as UpdateCustomerPayload);
      } else {
        await customersService.createCustomer(payload as CreateCustomerPayload);
      }
      history.push("/customers");
    } catch (err) {
      setErrors({
        submit: err instanceof Error ? err.message : "Erreur enregistrement"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout title={isEdit ? "Modifier le client" : "Nouveau client"}>
      <FloatingActionButton
        label="Enregistrer"
        formId="customer-form"
        disabled={isSaving || isLoading}
      />
      <div className="animate-fade-up flex flex-col gap-6">
        <div className="hidden items-center justify-between rounded-2xl border border-border/60 bg-panel/65 px-4 py-3 sm:flex">
          <button
            type="button"
            onClick={() => history.push("/customers")}
            className="inline-flex items-center gap-2 text-sm font-semibold text-ink transition hover:text-brand"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <ArrowRight className="h-4 w-4 rotate-180" />
            </span>
            Retour aux clients
          </button>
        </div>

        {errors.submit && (
          <div className="rounded-2xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-ink">
            {errors.submit}
          </div>
        )}

        <div className="rounded-2xl border border-border/60 bg-panel p-4 sm:p-5">
          <button
            type="button"
            onClick={() => history.push("/customers")}
            className="mb-4 flex items-center gap-2 text-sm font-semibold text-brand sm:hidden"
          >
            <ArrowRight className="h-4 w-4 rotate-180" />
            Retour à la liste
          </button>

          <form id="customer-form" onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nom du client"
              value={form.name}
              onChange={(e) =>
                setForm((p) => ({ ...p, name: e.target.value }))
              }
              error={errors.name}
              placeholder="Nom complet"
              disabled={isSaving}
            />

            <Input
              label="Téléphone"
              value={form.phone}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  phone: formatPhoneMadagascar(e.target.value)
                }))
              }
              onFocus={(e) => {
                if (!form.phone) {
                  setForm((p) => ({ ...p, phone: PHONE_PREFIX }));
                }
                guardPhonePrefix(e.currentTarget);
              }}
              onClick={(e) => guardPhonePrefix(e.currentTarget)}
              onKeyUp={(e) => guardPhonePrefix(e.currentTarget)}
              onKeyDown={(e) => {
                const input = e.currentTarget;
                const start = input.selectionStart ?? 0;
                const end = input.selectionEnd ?? 0;
                const isBackspaceOnPrefix =
                  e.key === "Backspace" &&
                  start <= PHONE_PREFIX.length &&
                  end <= PHONE_PREFIX.length;
                const isDeleteOnPrefix =
                  e.key === "Delete" && start < PHONE_PREFIX.length;
                const isHome = e.key === "Home";
                const isArrowLeftAtPrefix =
                  e.key === "ArrowLeft" && start <= PHONE_PREFIX.length;

                if (
                  isBackspaceOnPrefix ||
                  isDeleteOnPrefix ||
                  isHome ||
                  isArrowLeftAtPrefix
                ) {
                  e.preventDefault();
                  requestAnimationFrame(() => {
                    input.setSelectionRange(
                      PHONE_PREFIX.length,
                      PHONE_PREFIX.length
                    );
                  });
                }
              }}
              error={errors.phone}
              placeholder="+261 34 12 345 67"
              disabled={isSaving}
            />

            <Input
              label="Adresse (optionnel)"
              value={form.delivery_address}
              onChange={(e) =>
                setForm((p) => ({ ...p, delivery_address: e.target.value }))
              }
              placeholder="Adresse de livraison"
              disabled={isSaving}
            />
          </form>
        </div>
      </div>
    </Layout>
  );
}
