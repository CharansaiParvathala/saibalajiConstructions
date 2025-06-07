
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { UserRole } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(amount);
}

// Add a type assertion function for string values
export function asString<T extends string>(value: unknown): T {
  return value as T;
}

// Add a specific type assertion function for UserRole
export function asUserRole(value: string): UserRole {
  return value as UserRole;
}

// Generate vibrant gradient background based on index
export function getGradientByIndex(index: number): string {
  const gradients = [
    'bg-gradient-to-br from-purple-100/30 to-indigo-100/30',
    'bg-gradient-to-br from-green-100/30 to-blue-100/30',
    'bg-gradient-to-br from-yellow-100/30 to-green-100/30',
    'bg-gradient-to-br from-pink-100/30 to-blue-100/30',
  ];
  
  return gradients[index % gradients.length];
}

// Get a vibrant color for charts based on index
export function getChartColorByIndex(index: number): string {
  const colors = [
    '#9b87f5', // custom-purple
    '#8B5CF6', // custom-vivid-purple
    '#F97316', // custom-bright-orange
    '#0EA5E9', // custom-ocean-blue
    '#D946EF', // custom-magenta-pink
    '#86EFAC', // custom-pastel-green
    '#93C5FD', // custom-pastel-blue
  ];
  
  return colors[index % colors.length];
}
