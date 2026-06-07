import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Combine les classes Tailwind de manière sécurisée */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Formater un prix en Ariary malgache */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('fr-MG', {
    style: 'decimal',
    minimumFractionDigits: 0,
  }).format(amount) + ' Ar'
}

/** Formater une date ISO en format lisible */
export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr))
}

/** Formater une date courte */
export function formatShortDate(dateStr: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr))
}

/** Obtenir les initiales d'un utilisateur */
export function getInitials(firstName: string, lastName?: string | null): string {
  const first = firstName.charAt(0).toUpperCase()
  const last = lastName ? lastName.charAt(0).toUpperCase() : ''
  return first + last
}

/** Calculer la marge entre prix d'achat et prix de vente */
export function calculateMargin(costPrice: number, sellingPrice: number): number {
  if (costPrice === 0) return 0
  return Math.round(((sellingPrice - costPrice) / costPrice) * 100)
}
