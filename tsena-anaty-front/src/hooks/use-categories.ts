import { useQuery } from '@tanstack/react-query'

// Le backend n'a pas d'endpoint /categories séparé.
// Les catégories sont gérées en tant que champ sur les produits.
// Ce hook est conservé comme stub pour la compatibilité UI.

export interface Category {
  id: string
  name: string
}

/** Hook stub — pas d'endpoint backend pour les catégories */
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async (): Promise<Category[]> => {
      // Pas d'endpoint backend - retourne un tableau vide
      return []
    },
  })
}
