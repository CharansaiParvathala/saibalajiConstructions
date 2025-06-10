import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Truck,
  FileText,
  Settings,
  LogOut,
  PlusCircle,
  ListChecks,
  DollarSign,
  History,
  ClipboardList,
  BarChart3,
  Link as LinkIcon,
  FileCheck,
  FileClock,
  Gavel,
} from 'lucide-react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  roles: string[];
}

const navigationItems: NavItem[] = [
  // Admin navigation
  {
    title: 'Dashboard',
    href: '/admin',
    icon: <LayoutDashboard className="h-5 w-5" />,
    roles: ['admin'],
  },
  {
    title: 'Statistics',
    href: '/admin/statistics',
    icon: <BarChart3 className="h-5 w-5" />,
    roles: ['admin'],
  },
  {
    title: 'Vehicles',
    href: '/admin/vehicles',
    icon: <Truck className="h-5 w-5" />,
    roles: ['admin'],
  },
  {
    title: 'Drivers',
    href: '/admin/drivers',
    icon: <Users className="h-5 w-5" />,
    roles: ['admin'],
  },
  {
    title: 'Tenders',
    href: '/admin/tenders',
    icon: <Gavel className="h-5 w-5" />,
    roles: ['admin'],
  },
  {
    title: 'Backup',
    href: '/admin/backup',
    icon: <FileText className="h-5 w-5" />,
    roles: ['admin'],
  },
  {
    title: 'Credentials',
    href: '/admin/credentials',
    icon: <Settings className="h-5 w-5" />,
    roles: ['admin'],
  },
  {
    title: 'Export Data',
    href: '/admin/export-data',
    icon: <FileText className="h-5 w-5" />,
    roles: ['admin'],
  },

  // Leader navigation
  {
    title: 'Dashboard',
    href: '/leader',
    icon: <LayoutDashboard className="h-5 w-5" />,
    roles: ['leader'],
  },
  {
    title: 'Create Project',
    href: '/leader/create-project',
    icon: <PlusCircle className="h-5 w-5" />,
    roles: ['leader'],
  },
  {
    title: 'Add Progress',
    href: '/leader/add-progress',
    icon: <ListChecks className="h-5 w-5" />,
    roles: ['leader'],
  },
  {
    title: 'View Progress',
    href: '/leader/view-progress',
    icon: <ClipboardList className="h-5 w-5" />,
    roles: ['leader'],
  },
  {
    title: 'Request Payment',
    href: '/leader/request-payment',
    icon: <DollarSign className="h-5 w-5" />,
    roles: ['leader'],
  },
  {
    title: 'View Payment',
    href: '/leader/view-payment',
    icon: <History className="h-5 w-5" />,
    roles: ['leader'],
  },
  {
    title: 'Final Submission',
    href: '/leader/final-submission',
    icon: <FileCheck className="h-5 w-5" />,
    roles: ['leader'],
  },

  // Owner navigation
  {
    title: 'Dashboard',
    href: '/owner',
    icon: <LayoutDashboard className="h-5 w-5" />,
    roles: ['owner'],
  },
  {
    title: 'Projects',
    href: '/owner/projects',
    icon: <ClipboardList className="h-5 w-5" />,
    roles: ['owner'],
  },
  {
    title: 'Statistics',
    href: '/owner/statistics',
    icon: <BarChart3 className="h-5 w-5" />,
    roles: ['owner'],
  },
  {
    title: 'Payment Queue',
    href: '/owner/payment-queue',
    icon: <DollarSign className="h-5 w-5" />,
    roles: ['owner'],
  },
  {
    title: 'Backup Links',
    href: '/owner/backup-links',
    icon: <LinkIcon className="h-5 w-5" />,
    roles: ['owner'],
  },

  // Checker navigation
  {
    title: 'Dashboard',
    href: '/checker',
    icon: <LayoutDashboard className="h-5 w-5" />,
    roles: ['checker'],
  },
  {
    title: 'Projects',
    href: '/checker/projects',
    icon: <ClipboardList className="h-5 w-5" />,
    roles: ['checker'],
  },
  {
    title: 'Review Submissions',
    href: '/checker/review-submissions',
    icon: <FileCheck className="h-5 w-5" />,
    roles: ['checker'],
  },
  {
    title: 'Review History',
    href: '/checker/review-history',
    icon: <FileClock className="h-5 w-5" />,
    roles: ['checker'],
  },
];

export function Navigation() {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) {
    return null;
  }

  const filteredNavItems = navigationItems.filter((item) =>
    item.roles.includes(user.role)
  );

  return (
    <nav className="flex flex-col h-full">
      <div className="flex-1 space-y-1 px-2 py-4">
        {filteredNavItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              'group flex items-center px-2 py-2 text-sm font-medium rounded-md',
              location.pathname === item.href
                ? 'bg-gray-900 text-white'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            )}
          >
            {item.icon}
            <span className="ml-3">{item.title}</span>
          </Link>
        ))}
      </div>
      <div className="flex-shrink-0 border-t border-gray-700 p-4">
        <button
          onClick={() => logout()}
          className="group flex w-full items-center px-2 py-2 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-700 hover:text-white"
        >
          <LogOut className="mr-3 h-5 w-5" />
          Logout
        </button>
      </div>
    </nav>
  );
} 