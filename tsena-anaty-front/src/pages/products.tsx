import { useState } from "react";
import type { Product } from "@/types";
import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from "@/hooks/use-products";
import { useCategories } from "@/hooks/use-categories";
import { ProductTable } from "@/components/products/product-table";
import { ProductForm } from "@/components/products/product-form";
import { Modal } from "@/components/ui/modal";
import { TableSkeleton } from "@/components/ui/loading";
import { ErrorState } from "@/components/ui/error-state";

/** Page de gestion des produits */
function ProductsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);

  const { data: productsData, isLoading, error, refetch } = useProducts();
  const { data: categories = [] } = useCategories();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const products = productsData?.data || [];

  const handleAdd = () => {
    setEditProduct(null);
    setModalOpen(true);
  };

  const handleEdit = (product: Product) => {
    setEditProduct(product);
    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Supprimer ce produit ?")) {
      deleteProduct.mutate(id);
    }
  };

  const handleSubmit = (data: Record<string, unknown>) => {
    if (editProduct && editProduct.id) {
      updateProduct.mutate(
        {
          id: editProduct.id,
          data: data as Parameters<typeof updateProduct.mutate>[0]["data"],
        },
        { onSuccess: () => setModalOpen(false) },
      );
    } else {
      createProduct.mutate(data as Parameters<typeof createProduct.mutate>[0], {
        onSuccess: () => setModalOpen(false),
      });
    }
  };

  if (isLoading) return <TableSkeleton />;
  if (error)
    return (
      <ErrorState
        message="Impossible de charger les produits"
        onRetry={refetch}
      />
    );

  return (
    <>
      <ProductTable
        products={products}
        categories={categories}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editProduct ? "Modifier le produit" : "Nouveau produit"}
      >
        <ProductForm
          product={editProduct}
          categories={categories}
          onSubmit={handleSubmit}
          isLoading={createProduct.isPending || updateProduct.isPending}
        />
      </Modal>
    </>
  );
}

export default ProductsPage;
