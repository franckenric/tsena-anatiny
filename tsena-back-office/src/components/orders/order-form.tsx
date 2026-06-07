import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { User, Product } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const orderSchema = z.object({
  user_id: z.coerce.number().min(1, "Le commercial est requis"),
  product_id: z.coerce.number().min(1, "Le produit est requis"),
  customer_name: z.string().min(1, "Le nom du client est requis"),
  customer_phone: z.string().optional(),
  delivery_address: z.string().optional(),
  quantity: z.coerce.number().min(1, "Quantité minimum 1"),
  note: z.string().optional(),
});

type OrderFormData = z.infer<typeof orderSchema>;
type OrderFormInput = z.input<typeof orderSchema>;

type OrderFormProps = {
  commercials: User[];
  products: Product[];
  onSubmit: (data: OrderFormData) => void;
  isLoading?: boolean;
};

/** Formulaire de création d'une commande */
function OrderForm({
  commercials,
  products,
  onSubmit,
  isLoading,
}: OrderFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OrderFormInput, unknown, OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      user_id: 0,
      product_id: 0,
      customer_name: "",
      customer_phone: "",
      delivery_address: "",
      quantity: 1,
      note: "",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="user_id">Commercial</Label>
        <Select id="user_id" {...register("user_id")}>
          <option value="0">Sélectionner un commercial</option>
          {commercials.map((c) => (
            <option key={c.id} value={c.id}>
              {c.email || "-"}
            </option>
          ))}
        </Select>
        {errors.user_id && (
          <p className="mt-1 text-xs text-danger">{errors.user_id.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="product_id">Produit</Label>
        <Select id="product_id" {...register("product_id")}>
          <option value="0">Sélectionner un produit</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} - {(p.selling_price || 0).toLocaleString("fr-FR")} Ar
            </option>
          ))}
        </Select>
        {errors.product_id && (
          <p className="mt-1 text-xs text-danger">
            {errors.product_id.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="customer_name">Nom du client</Label>
          <Input
            id="customer_name"
            {...register("customer_name")}
            placeholder="Nom du client"
          />
          {errors.customer_name && (
            <p className="mt-1 text-xs text-danger">
              {errors.customer_name.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="customer_phone">Téléphone client</Label>
          <Input
            id="customer_phone"
            {...register("customer_phone")}
            placeholder="0341234567"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="delivery_address">Adresse de livraison</Label>
        <Input
          id="delivery_address"
          {...register("delivery_address")}
          placeholder="Adresse (optionnel)"
        />
      </div>

      <div>
        <Label htmlFor="quantity">Quantité</Label>
        <Input id="quantity" type="number" {...register("quantity")} min="1" />
        {errors.quantity && (
          <p className="mt-1 text-xs text-danger">{errors.quantity.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="note">Note (optionnel)</Label>
        <Textarea id="note" {...register("note")} placeholder="Remarques..." />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Création..." : "Créer la commande"}
      </Button>
    </form>
  );
}

export { OrderForm };
