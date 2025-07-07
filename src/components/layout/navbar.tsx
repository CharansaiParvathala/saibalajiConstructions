import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/context/theme-provider';
import { useLanguage } from '@/context/language-context';
import { ModeToggle } from '@/components/shared/mode-toggle';
import { LanguageSwitcher } from '@/components/shared/language-switcher';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu, X } from 'lucide-react';

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
    document.body.classList.toggle('sidebar-open');
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
    document.body.classList.remove('sidebar-open');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isRouteActive = (route: string) => {
    if (["/leader", "/checker", "/owner", "/admin"].includes(route)) {
      return location.pathname === route;
    }
    return location.pathname.startsWith(route);
  };

  // Define navigation items based on user role
  const getNavItems = () => {
    if (!user) return [];

    switch (user.role) {
      case 'leader':
        return [
          { name: t('app.navigation.dashboard'), path: '/leader' },
          { name: t('app.navigation.createProject'), path: '/leader/projects/new' },
          { name: t('app.navigation.addProgress'), path: '/leader/add-progress' },
          { name: t('app.navigation.viewProgress'), path: '/leader/view-progress' },
          { name: t('app.navigation.requestPayment'), path: '/leader/request-payment' },
          { name: t('app.navigation.viewPayment'), path: '/leader/view-payment' }
        ];
      case 'checker':
        return [
          { name: t('app.navigation.dashboard'), path: '/checker' },
          { name: t('app.navigation.reviewSubmissions'), path: '/checker/review-submissions' },
          { name: t('app.navigation.reviewHistory'), path: '/checker/review-history' },
          { name: t('app.navigation.projects'), path: '/checker/projects' }
        ];
      case 'owner':
        return [
          { name: t('app.navigation.dashboard'), path: '/owner' },
          { name: t('app.navigation.paymentQueue'), path: '/owner/payment-queue' },
          { name: t('app.navigation.projects'), path: '/owner/projects' },
          { name: t('app.navigation.statistics'), path: '/owner/statistics' },
          { name: t('app.navigation.backup'), path: '/owner/backup-links' }
        ];
      case 'admin':
        return [
          { name: t('app.navigation.dashboard'), path: '/admin' },
          { name: t('app.navigation.credentials'), path: '/admin/credentials' },
          { name: t('app.navigation.vehicles'), path: '/admin/vehicles' },
          { name: t('app.navigation.drivers'), path: '/admin/drivers' },
          { name: t('app.navigation.statistics'), path: '/admin/statistics' },
          { name: t('app.navigation.backup'), path: '/admin/backup' },
          { name: t('app.navigation.exportData'), path: '/admin/export-data' },
          { name: t('app.navigation.createTender'), path: '/admin/create-tender' }
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <>
      <nav className="bg-background border-b z-50">
        <div className="container mx-auto px-4 flex items-center justify-between h-14">
          {/* Mobile Menu Button */}
          <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="sm" onClick={toggleSidebar}>
                {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64">
              <SheetHeader>
                <SheetTitle>{t('app.navigation.menu')}</SheetTitle>
                <SheetDescription>{t('app.navigation.menuDescription')}</SheetDescription>
              </SheetHeader>
              
              <div className="py-4">
                {isAuthenticated && user ? (
                  <>
                    {navItems.map((item, index) => (
                      <Link
                        key={index}
                        to={item.path}
                        className={`flex items-center py-2 px-4 rounded-md hover:bg-secondary ${isRouteActive(item.path) ? 'bg-secondary' : ''}`}
                        onClick={closeSidebar}
                      >
                        <span>{item.name}</span>
                      </Link>
                    ))}
                  </>
                ) : (
                  <>
                    <Link to="/login" className="flex items-center py-2 px-4 rounded-md hover:bg-secondary" onClick={closeSidebar}>
                      <span>{t('app.auth.login')}</span>
                    </Link>
                    <Link to="/signup" className="flex items-center py-2 px-4 rounded-md hover:bg-secondary" onClick={closeSidebar}>
                      <span>{t('app.auth.signup')}</span>
                    </Link>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo and Title */}
          <Link to="/" className="flex items-center space-x-2">
            <img 
              src="/lovable-uploads/a723c9c5-8174-41c6-b9d7-2d8646801ec6.png" 
              alt="SB Constructions" 
              className="h-8 w-8 rounded-full"
            />
            <span className="font-bold text-xl">SB Constructions</span>
          </Link>

          {/* Desktop Navigation */}
          {isAuthenticated && (
            <div className="hidden md:flex items-center space-x-1 overflow-x-auto">
              {navItems.map((item, index) => (
                <Button
                  key={index}
                  variant={isRouteActive(item.path) ? "secondary" : "ghost"}
                  size="sm"
                  className="whitespace-nowrap"
                  asChild
                >
                  <Link to={item.path}>{item.name}</Link>
                </Button>
              ))}
            </div>
          )}

          {/* Right Side - User Menu, Theme Toggle, Language */}
          <div className="flex items-center space-x-1">
            <LanguageSwitcher />
            <ModeToggle />

            {isAuthenticated && user ? (
              <Button variant="outline" size="sm" onClick={handleLogout} className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v1" /></svg>
              </Button>
            ) : (
              <div className="hidden md:flex items-center space-x-2">
                <Button size="sm" variant="ghost" asChild>
                  <Link to="/login">{t('app.auth.login')}</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/signup">{t('app.auth.signup')}</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
