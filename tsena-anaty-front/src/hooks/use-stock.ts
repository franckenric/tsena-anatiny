import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { stockMovementsApi } from '@/lib/api'
import type { CreateStockMovementRequest, UpdateStockMovementRequest, ListParams } from '@/types'
import { toast } from 'sonner'

/** Hook pour récupérer les mouvements de stock */
export function useStockMovements(params?: ListParams) {
  return useQuery({
    queryKey: ['stock-movements', params],
    queryFn: () => stockMovementsApi.getAll(params),
  })
}

/** Hook pour récupérer un mouvement de stock par ID */
export function useStockMovement(id: string) {
  return useQuery({
    queryKey: ['stock-movements', id],
    queryFn: () => stockMovementsApi.getById(id),
    enabled: !!id,
  })
}

/** Hook pour créer un mouvement de stock */
export function useCreateStockMovement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateStockMovementRequest) => stockMovementsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] })
      toast.success('Mouvement de stock enregistré')
    },
    onError: () => {
      toast.error('Erreur lors de l\'enregistrement du mouvement')
    },
  })
}

/** Hook pour mettre à jour un mouvement de stock */
export function useUpdateStockMovement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStockMovementRequest }) =>
      stockMovementsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] })
      toast.success('Mouvement de stock mis à jour')
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour')
    },
  })
}

/** Hook pour supprimer un mouvement de stock */
export function useDeleteStockMovement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => stockMovementsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] })
      toast.success('Mouvement de stock supprimé')
    },
    onError: () => {
      toast.error('Erreur lors de la suppression')
    },
  })
}
