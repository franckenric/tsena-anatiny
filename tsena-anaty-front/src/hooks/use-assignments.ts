import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { assignmentsApi } from '@/lib/api'
import type { CreateAssignmentRequest, UpdateAssignmentRequest, ListParams } from '@/types'
import { toast } from 'sonner'

/** Hook pour récupérer les assignations */
export function useAssignments(params?: ListParams) {
  return useQuery({
    queryKey: ['assignments', params],
    queryFn: () => assignmentsApi.getAll(params),
  })
}

/** Hook pour récupérer une assignation par ID */
export function useAssignment(id: string) {
  return useQuery({
    queryKey: ['assignments', id],
    queryFn: () => assignmentsApi.getById(id),
    enabled: !!id,
  })
}

/** Hook pour créer une assignation */
export function useCreateAssignment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateAssignmentRequest) => assignmentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
      toast.success('Assignation créée')
    },
    onError: () => {
      toast.error('Erreur lors de l\'assignation')
    },
  })
}

/** Hook pour mettre à jour une assignation */
export function useUpdateAssignment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAssignmentRequest }) =>
      assignmentsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
      toast.success('Assignation mise à jour')
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour')
    },
  })
}

/** Hook pour supprimer une assignation */
export function useDeleteAssignment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => assignmentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
      toast.success('Assignation supprimée')
    },
    onError: () => {
      toast.error('Erreur lors de la suppression')
    },
  })
}
