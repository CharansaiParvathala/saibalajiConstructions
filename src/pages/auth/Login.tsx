import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/context/language-context';
import { toast } from 'sonner';
import { AuthLogo } from '@/components/auth/AuthLogo';
import { Eye, EyeOff, LogIn } from 'lucide-react';

export default function Login() {
  const { login, user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Handle navigation after successful login
  useEffect(() => {
    if (user && user.role) {
      const rolePath = `/${user.role.toLowerCase()}`;
      console.log('Navigating to:', rolePath);
      navigate(rolePath, { replace: true });
    }
  }, [user, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const user = await login(formData.email, formData.password);
      // Navigation will be handled by the useEffect hook
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Login failed');
      toast.error(t('app.auth.loginError'));
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
            Login
          </CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            Please enter your email and password to sign in.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input 
                id="email" 
                name="email"
                type="email" 
                placeholder="Enter your email" 
                value={formData.email}
                onChange={handleChange}
                required
                className="h-11 border-2 border-border/50 focus:border-primary transition-all duration-200"
              />
            </div>
            <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative">
                <Input 
                  id="password" 
                  name="password"
                  type={showPassword ? "text" : "password"} 
                  placeholder="Enter your password" 
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

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="remember-me" className="text-sm text-muted-foreground">Remember me</label>
              </div>
              <Link to="/forgot-password" className="text-sm text-primary hover:text-primary/80">Forgot password?</Link>
            </div>

            <Button type="submit" className="w-full h-11 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 transition-all duration-200" disabled={loading}>
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </div>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn size={18} />
                  Sign in
                </span>
              )}
            </Button>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary hover:text-primary/80 font-medium transition-colors">Sign up</Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
