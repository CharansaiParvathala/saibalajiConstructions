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

export const getStatusBadge = (status: string) => {
  const statusConfig = {
    pending: { label: 'Pending', variant: 'warning' },
    approved: { label: 'Approved', variant: 'success' },
    rejected: { label: 'Rejected', variant: 'destructive' }
  };

  return statusConfig[status as keyof typeof statusConfig] || { label: status, variant: 'default' };
};

export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
};

export const getRandomColor = (index: number) => {
  const colors = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#96CEB4', // Green
    '#FFEEAD', // Yellow
    '#D4A5A5', // Pink
    '#9B59B6', // Purple
    '#3498DB', // Light Blue
    '#E67E22', // Orange
    '#1ABC9C', // Turquoise
  ];

  return colors[index % colors.length];
};

export const getRoleLabel = (role: UserRole) => {
  const roleLabels: Record<UserRole, string> = {
    [UserRole.ADMIN]: 'Admin',
    [UserRole.LEADER]: 'Leader',
    [UserRole.USER]: 'User',
  };

  return roleLabels[role] || role;
};
