import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { t } from '@/i18n';
import { LayoutDashboard, BarChart3, Car, Users, FileText, HardDrive, Key, Download, Plus, TrendingUp, Eye, CreditCard, Receipt, CheckCircle, FolderOpen, ClipboardCheck, History } from 'lucide-react';
import { getProjectsByLeaderId } from '@/lib/storage';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  className?: string;
}

export function Sidebar({ isOpen, toggleSidebar, className }: SidebarProps) {
  const { user } = useAuth();
  const location = useLocation();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [hasCompletedProjects, setHasCompletedProjects] = useState(false);

  useEffect(() => {
    if (user?.role === 'leader') {
      const userProjects = getProjectsByLeaderId(user.id);
      const completed = userProjects.some(project => project.completedWork >= project.totalWork);
      setHasCompletedProjects(completed);
    }
  }, [user]);

  // Toggle section expansion
  const toggleSection = (section: string) => {
    if (expandedSection === section) {
      setExpandedSection(null);
    } else {
      setExpandedSection(section);
    }
  };

  // Check if the current route matches
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const getNavigationItems = () => {
    const baseItems = [
      {
        title: t("app.navigation.dashboard"),
        url: `/${user.role}`,
        icon: LayoutDashboard,
      },
    ];

    switch (user.role) {
      case 'admin':
        return [
          ...baseItems,
          {
            title: t("app.navigation.statistics"),
            url: "/admin/statistics",
            icon: BarChart3,
          },
          {
            title: t("app.navigation.vehicles"),
            url: "/admin/vehicles",
            icon: Car,
          },
          {
            title: t("app.navigation.drivers"),
            url: "/admin/drivers",
            icon: Users,
          },
          {
            title: "Tenders",
            url: "/admin/tenders",
            icon: FileText,
          },
          {
            title: t("app.navigation.backup"),
            url: "/admin/backup",
            icon: HardDrive,
          },
          {
            title: t("app.navigation.credentials"),
            url: "/admin/credentials",
            icon: Key,
          },
          {
            title: t("app.navigation.exportData"),
            url: "/admin/export-data",
            icon: Download,
          },
          {
            title: "Create Tender Document",
            url: "/admin/create-tender",
            icon: FileText,
          },
        ];

      case 'leader':
        const leaderItems = [
          ...baseItems,
          {
            title: t("app.navigation.createProject"),
            url: "/leader/create-project",
            icon: Plus,
          },
          {
            title: t("app.navigation.addProgress"),
            url: "/leader/add-progress",
            icon: TrendingUp,
          },
          {
            title: t("app.navigation.viewProgress"),
            url: "/leader/view-progress",
            icon: Eye,
          },
          {
            title: t("app.navigation.requestPayment"),
            url: "/leader/request-payment",
            icon: CreditCard,
          },
          {
            title: t("app.navigation.viewPayment"),
            url: "/leader/view-payment",
            icon: Receipt,
          },
        ];

        // Only add final submission if there are completed projects
        if (hasCompletedProjects) {
          leaderItems.push({
            title: "Final Submission",
            url: "/leader/final-submission",
            icon: CheckCircle,
          });
        }

        return leaderItems;

      case 'owner':
        return [
          ...baseItems,
          {
            title: t("app.navigation.projects"),
            url: "/owner/projects",
            icon: FolderOpen,
          },
          {
            title: t("app.navigation.statistics"),
            url: "/owner/statistics",
            icon: BarChart3,
          },
          {
            title: t("app.navigation.paymentQueue"),
            url: "/owner/payment-queue",
            icon: CreditCard,
          },
          {
            title: t("app.navigation.backupLinks"),
            url: "/owner/backup-links",
            icon: Link,
          },
        ];

      case 'checker':
        return [
          ...baseItems,
          {
            title: t("app.navigation.projects"),
            url: "/checker/projects",
            icon: FolderOpen,
          },
          {
            title: t("app.navigation.reviewSubmissions"),
            url: "/checker/review-submissions",
            icon: ClipboardCheck,
          },
          {
            title: t("app.navigation.reviewHistory"),
            url: "/checker/review-history",
            icon: History,
          },
        ];

      default:
        return baseItems;
    }
  };

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 w-64 bg-sidebar border-r border-border pt-16 z-20 transition-transform duration-200 ease-in-out transform lg:transform-none lg:relative",
        "backdrop-blur-sm shadow-lg shadow-sidebar/10",
        isOpen ? "translate-x-0" : "-translate-x-full",
        className
      )}
    >
      <div className="flex flex-col h-full p-4 overflow-y-auto">
        <div className="mb-4 border-b pb-4 border-border/50">
          <div className="flex items-center justify-between mb-4">
            <span className="font-bold text-xl text-white">Navigation</span>
            {/* Close button for mobile */}
            <Button
              variant="ghost" 
              size="icon"
              className="lg:hidden text-white hover:bg-white/20"
              onClick={toggleSidebar}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Menu based on user role */}
        {getNavigationItems().map((item) => (
          <Link to={item.url} onClick={toggleSidebar} key={item.url}>
            <Button
              variant={isActive(item.url) ? 'default' : 'ghost'}
              className={cn(
                "w-full justify-start rounded-lg text-sm font-medium transition-all",
                isActive(item.url) 
                  ? "bg-gradient-to-r from-primary to-primary/80 text-white shadow-md shadow-primary/20" 
                  : "hover:bg-white/20 hover:text-white"
              )}
            >
              {item.title}
            </Button>
          </Link>
        ))}
      </div>
    </aside>
  );
}
