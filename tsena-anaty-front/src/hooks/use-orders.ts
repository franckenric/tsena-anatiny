import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ordersApi } from '@/lib/api'
import type { CreateOrderRequest, UpdateOrderRequest, ListParams } from '@/types'
import { toast } from 'sonner'

/** Hook pour récupérer toutes les commandes */
export function useOrders(params?: ListParams) {
  return useQuery({
    queryKey: ['orders', params],
    queryFn: () => ordersApi.getAll(params),
  })
}

/** Hook pour créer une commande */
export function useCreateOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateOrderRequest) => ordersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      toast.success('Commande créée avec succès')
    },
    onError: () => {
      toast.error('Erreur lors de la création de la commande')
    },
  })
}

/** Hook pour mettre à jour une commande */
export function useUpdateOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOrderRequest }) =>
      ordersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      toast.success('Commande mise à jour')
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour')
    },
  })
}
