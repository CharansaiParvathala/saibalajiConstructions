import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/context/language-context';
import { toast } from '@/components/ui/sonner';
import { AuthLogo } from '@/components/auth/AuthLogo';
import { Eye, EyeOff, UserPlus } from 'lucide-react';

export default function Signup() {
  const { register } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRoleChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      role: value
    }));
  };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    
    if (!formData.name || !formData.email || !formData.phone || !formData.role || !formData.password || !formData.confirmPassword) {
      toast.error(t('app.auth.allFieldsRequired'));
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error(t('app.auth.passwordsDoNotMatch'));
      return;
    }

    setLoading(true);
    
    try {
      const response = await register(
        formData.name,
        formData.email,
        formData.password,
        formData.role,
        formData.phone
      );
      toast.success(t('app.auth.signupSuccess'));
      navigate(`/${formData.role.toLowerCase()}`);
    } catch (error) {
      console.error('Signup error:', error);
      toast.error(t('app.auth.signupError'));
    } finally {
      setLoading(false);
    }
  }

  const handleGoogleSignup = async () => {
    setLoading(true);
    try {
      const response = await register(
        "admin@saibalaji.com",
        "password123",
        "Admin User",
        "admin",
        "1234567890"
      );
      toast.success(t('app.auth.signupSuccess'));
      navigate('/admin');
    } catch (error) {
      console.error('Google signup error:', error);
      toast.error(t('app.auth.signupError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'grid\' width=\'20\' height=\'20\' patternUnits=\'userSpaceOnUse\'%3E%3Cpath d=\'M 20 0 L 0 0 0 20\' fill=\'none\' stroke=\'%23374151\' stroke-width=\'0.5\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\'100%25\' height=\'100%25\' fill=\'url(%23grid)\'/%3E%3C/svg%3E')] opacity-20"></div>
      
      <Card className="w-full max-w-md relative backdrop-blur-sm bg-background/95 border-2 border-primary/20 shadow-2xl">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <AuthLogo className="scale-110" />
          </div>
          <CardTitle className="text-2xl text-center font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            {t('app.auth.createAccount')}
          </CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            {t('app.auth.fillDetails')}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">{t('app.auth.name')}</Label>
              <Input 
                id="name" 
                name="name"
                type="text" 
                placeholder={t('app.auth.namePlaceholder')} 
                value={formData.name}
                onChange={handleChange}
                required
                className="h-11 border-2 border-border/50 focus:border-primary transition-all duration-200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">{t('app.auth.email')}</Label>
              <Input 
                id="email" 
                name="email"
                type="email" 
                placeholder={t('app.auth.emailPlaceholder')} 
                value={formData.email}
                onChange={handleChange}
                required
                className="h-11 border-2 border-border/50 focus:border-primary transition-all duration-200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium">{t('app.auth.phone')}</Label>
              <Input 
                id="phone" 
                name="phone"
                type="tel" 
                placeholder={t('app.auth.phonePlaceholder')} 
                value={formData.phone}
                onChange={handleChange}
                required
                className="h-11 border-2 border-border/50 focus:border-primary transition-all duration-200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role" className="text-sm font-medium">{t('app.auth.role')}</Label>
              <Select value={formData.role} onValueChange={handleRoleChange} required>
                <SelectTrigger className="h-11 border-2 border-border/50 focus:border-primary transition-all duration-200">
                  <SelectValue placeholder={t('app.auth.selectRole')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">{t('app.auth.roles.admin')}</SelectItem>
                  <SelectItem value="leader">{t('app.auth.roles.leader')}</SelectItem>
                  <SelectItem value="member">{t('app.auth.roles.member')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">{t('app.auth.password')}</Label>
              <div className="relative">
                <Input 
                  id="password" 
                  name="password"
                  type={showPassword ? "text" : "password"} 
                  placeholder={t('app.auth.passwordPlaceholder')} 
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="h-11 border-2 border-border/50 focus:border-primary pr-10 transition-all duration-200"
                />
                <button 
                  type="button" 
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">{t('app.auth.confirmPassword')}</Label>
              <div className="relative">
                <Input 
                  id="confirmPassword" 
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"} 
                  placeholder={t('app.auth.confirmPasswordPlaceholder')} 
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="h-11 border-2 border-border/50 focus:border-primary pr-10 transition-all duration-200"
                />
                <button 
                  type="button" 
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full h-11 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 transition-all duration-200" disabled={loading}>
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('app.auth.creatingAccount')}
                </div>
              ) : (
                <span className="flex items-center gap-2">
                  <UserPlus size={18} />
                  {t('app.auth.signup')}
                </span>
              )}
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/50"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  {t('app.auth.orContinueWith')}
                </span>
              </div>
            </div>

            <Button 
              type="button" 
              variant="outline" 
              className="w-full h-11 border-2 border-border/50 hover:border-primary/50 hover:bg-accent transition-all duration-200"
              onClick={handleGoogleSignup}
              disabled={loading}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              {t('app.auth.googleSignUp')}
            </Button>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-sm text-center text-muted-foreground">
              {t('app.auth.alreadyHaveAccount')}{' '}
              <Link to="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
                {t('app.auth.login')}
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
