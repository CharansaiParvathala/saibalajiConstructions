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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'grid\' width=\'20\' height=\'20\' patternUnits=\'userSpaceOnUse\'%3E%3Cpath d=\'M 20 0 L 0 0 0 20\' fill=\'none\' stroke=\'%23374151\' stroke-width=\'0.5\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\'100%25\' height=\'100%25\' fill=\'url(%23grid)\'/%3E%3C/svg%3E')] opacity-20"></div>
      
      <Card className="w-full max-w-md relative backdrop-blur-sm bg-background/95 border-2 border-primary/20 shadow-2xl">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <AuthLogo className="scale-110" />
          </div>
          <CardTitle className="text-2xl text-center font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Sign Up
          </CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            Fill in your details to create an account.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">Name</Label>
              <Input 
                id="name" 
                name="name"
                type="text" 
                placeholder="Enter your name" 
                value={formData.name}
                onChange={handleChange}
                required
                className="h-11 border-2 border-border/50 focus:border-primary transition-all duration-200"
              />
            </div>
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
              <Label htmlFor="phone" className="text-sm font-medium">Phone</Label>
              <Input 
                id="phone" 
                name="phone"
                type="tel" 
                placeholder="Enter your phone number" 
                value={formData.phone}
                onChange={handleChange}
                required
                className="h-11 border-2 border-border/50 focus:border-primary transition-all duration-200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role" className="text-sm font-medium">Role</Label>
              <Select value={formData.role} onValueChange={handleRoleChange} required>
                <SelectTrigger className="h-11 border-2 border-border/50 focus:border-primary transition-all duration-200">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="leader">Leader</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                </SelectContent>
              </Select>
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
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</Label>
              <div className="relative">
                <Input 
                  id="confirmPassword" 
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"} 
                  placeholder="Confirm your password" 
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
                  Signing up...
                </div>
              ) : (
                <span className="flex items-center gap-2">
                  <UserPlus size={18} />
                  Sign up
                </span>
              )}
            </Button>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-sm text-center text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">Sign in</Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
