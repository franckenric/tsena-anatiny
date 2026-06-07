import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Product } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const movementSchema = z.object({
  product_id: z.coerce.number().min(1, "Le produit est requis"),
  user_id: z.coerce.number().min(1, "L'utilisateur est requis"),
  type: z.enum(["in_stock", "out_stock"]),
  quantity: z.coerce.number().min(1, "Quantité minimum 1"),
  reference: z.string().optional(),
});

type MovementFormData = z.infer<typeof movementSchema>;
type MovementFormInput = z.input<typeof movementSchema>;

type StockMovementFormProps = {
  products: Product[];
  currentUserId?: number;
  onSubmit: (data: MovementFormData) => void;
  isLoading?: boolean;
};

/** Formulaire d'entrée/sortie de stock */
function StockMovementForm({
  products,
  currentUserId,
  onSubmit,
  isLoading,
}: StockMovementFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MovementFormInput, unknown, MovementFormData>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      product_id: 0,
      user_id: currentUserId || 0,
      type: "in_stock",
      quantity: 1,
      reference: "",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="product_id">Produit</Label>
        <Select id="product_id" {...register("product_id")}>
          <option value="0">Sélectionner un produit</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
        {errors.product_id && (
          <p className="mt-1 text-xs text-danger">
            {errors.product_id.message}
          </p>
        )}
      </div>

      <input type="hidden" {...register("user_id")} />

      <div>
        <Label htmlFor="type">Type de mouvement</Label>
        <Select id="type" {...register("type")}>
          <option value="in_stock">Entrée</option>
          <option value="out_stock">Sortie</option>
        </Select>
        {errors.type && (
          <p className="mt-1 text-xs text-danger">{errors.type.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="quantity">Quantité</Label>
        <Input id="quantity" type="number" {...register("quantity")} min="1" />
        {errors.quantity && (
          <p className="mt-1 text-xs text-danger">{errors.quantity.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="reference">Référence (optionnel)</Label>
        <Input
          id="reference"
          {...register("reference")}
          placeholder="Référence du mouvement..."
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Enregistrement..." : "Enregistrer le mouvement"}
      </Button>
    </form>
  );
}

export { StockMovementForm };
