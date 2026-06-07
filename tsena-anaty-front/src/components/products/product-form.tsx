import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Product, Category } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const productSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  sku: z.string().min(1, "Le SKU est requis"),
  image: z.string().optional(),
  category_id: z.coerce.number().min(1, "La catégorie est requise"),
  cost_price: z.coerce.number().min(0, "Le prix doit être positif"),
  selling_price: z.coerce.number().min(0, "Le prix doit être positif"),
  unit: z.string().min(1, "L'unité est requise"),
  low_stock_alert: z.coerce.number().optional(),
  description: z.string().optional(),
  status: z.enum(["active", "inactive"]),
});

type ProductFormData = z.infer<typeof productSchema>;

type ProductFormProps = {
  product?: Product | null;
  categories: Category[];
  onSubmit: (data: ProductFormData) => void;
  isLoading?: boolean;
};

/** Formulaire de création/modification d'un produit */
function ProductForm({
  product,
  categories,
  onSubmit,
  isLoading,
}: ProductFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || "",
      sku: product?.sku || "",
      image: product?.image || "",
      category_id: product?.category_id || 0,
      cost_price: product?.cost_price || 0,
      selling_price: product?.selling_price || 0,
      unit: product?.unit || "unité",
      low_stock_alert: product?.low_stock_alert || 10,
      description: product?.description || "",
      status: product?.status || "active",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="name">Nom du produit</Label>
        <Input
          id="name"
          {...register("name")}
          placeholder="Ex: Riz local 50kg"
        />
        {errors.name && (
          <p className="mt-1 text-xs text-danger">{errors.name.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="sku">SKU</Label>
        <Input id="sku" {...register("sku")} placeholder="Ex: RIZ-LOC-50" />
        {errors.sku && (
          <p className="mt-1 text-xs text-danger">{errors.sku.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="category_id">Catégorie</Label>
        <Select id="category_id" {...register("category_id")}>
          <option value="0">Sélectionner une catégorie</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </Select>
        {errors.category_id && (
          <p className="mt-1 text-xs text-danger">
            {errors.category_id.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="cost_price">Prix d'achat (Ar)</Label>
          <Input id="cost_price" type="number" {...register("cost_price")} />
          {errors.cost_price && (
            <p className="mt-1 text-xs text-danger">
              {errors.cost_price.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="selling_price">Prix de vente (Ar)</Label>
          <Input
            id="selling_price"
            type="number"
            {...register("selling_price")}
          />
          {errors.selling_price && (
            <p className="mt-1 text-xs text-danger">
              {errors.selling_price.message}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="unit">Unité</Label>
          <Input
            id="unit"
            {...register("unit")}
            placeholder="Ex: kg, litre, pièce"
          />
          {errors.unit && (
            <p className="mt-1 text-xs text-danger">{errors.unit.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="status">Statut</Label>
          <Select id="status" {...register("status")}>
            <option value="active">Actif</option>
            <option value="inactive">Inactif</option>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...register("description")}
          placeholder="Description optionnelle..."
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading
          ? "Enregistrement..."
          : product
            ? "Modifier"
            : "Créer le produit"}
      </Button>
    </form>
  );
}

export { ProductForm };
