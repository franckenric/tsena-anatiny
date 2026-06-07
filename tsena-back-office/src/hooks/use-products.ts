import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productsApi } from '@/lib/api'
import type { CreateProductRequest, UpdateProductRequest, ListParams } from '@/types'
import { toast } from 'sonner'

/** Hook pour récupérer tous les produits */
export function useProducts(params?: ListParams) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => productsApi.getAll(params),
  })
}

/** Hook pour récupérer un produit par ID */
export function useProduct(id: string) {
  return useQuery({
    queryKey: ['products', id],
    queryFn: () => productsApi.getById(id),
    enabled: !!id,
  })
}

/** Hook pour créer un produit */
export function useCreateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateProductRequest) => productsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('Produit créé avec succès')
    },
    onError: () => {
      toast.error('Erreur lors de la création du produit')
    },
  })
}

/** Hook pour mettre à jour un produit */
export function useUpdateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductRequest }) =>
      productsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('Produit mis à jour')
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour')
    },
  })
}

/** Hook pour supprimer un produit */
export function useDeleteProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => productsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('Produit supprimé')
    },
    onError: () => {
      toast.error('Erreur lors de la suppression')
    },
  })
}
