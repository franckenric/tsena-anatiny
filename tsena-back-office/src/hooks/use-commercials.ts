import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '@/lib/api'
import type { CreateUserRequest, UpdateUserRequest, ListParams } from '@/types'
import { toast } from 'sonner'

// Le backend n'a pas de /commercials séparé.
// Les commerciaux sont des users avec role_id = 2.
// On filtre via le paramètre "where" du backend.

const COMMERCIAL_ROLE_ID = 2

/** Hook pour récupérer tous les commerciaux (users avec role_id = 2) */
export function useCommercials(params?: ListParams) {
  const commercialParams: ListParams = {
    ...params,
    where: JSON.stringify([{ column: 'role_id', value: COMMERCIAL_ROLE_ID }]),
  }
  return useQuery({
    queryKey: ['commercials', params],
    queryFn: () => usersApi.getAll(commercialParams),
  })
}

/** Hook pour récupérer un commercial par ID */
export function useCommercial(id: string) {
  return useQuery({
    queryKey: ['commercials', id],
    queryFn: () => usersApi.getById(id),
    enabled: !!id,
  })
}

/** Hook pour créer un commercial */
export function useCreateCommercial() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateUserRequest) => usersApi.create({ ...data, role_id: COMMERCIAL_ROLE_ID }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commercials'] })
      toast.success('Commercial créé avec succès')
    },
    onError: () => {
      toast.error('Erreur lors de la création du commercial')
    },
  })
}

/** Hook pour mettre à jour un commercial */
export function useUpdateCommercial() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserRequest }) =>
      usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commercials'] })
      toast.success('Commercial mis à jour')
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour')
    },
  })
}

/** Hook pour supprimer un commercial */
export function useDeleteCommercial() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commercials'] })
      toast.success('Commercial supprimé')
    },
    onError: () => {
      toast.error('Erreur lors de la suppression')
    },
  })
}
