import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/context/language-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/sonner';
import { AuthLogo } from '@/components/auth/AuthLogo';

export default function ForgotPassword() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error(t("app.auth.emailRequired"));
      return;
    }

    setLoading(true);

    try {
      // Placeholder for reset password API call
      // await resetPassword(email);
      
      setSubmitted(true);
      toast.success(t("app.auth.resetLinkSent"));
    } catch (error) {
      console.error('Password reset error:', error);
      toast.error(t("app.auth.resetError"));
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <AuthLogo />
            <CardTitle className="text-2xl">{t("app.auth.checkYourEmail")}</CardTitle>
            <CardDescription>
              {t("app.auth.resetLinkSentDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              {t("app.auth.didNotReceiveEmail")}
            </p>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setSubmitted(false)}
            >
              {t("app.auth.tryAgain")}
            </Button>
            <div className="text-sm text-center text-muted-foreground">
              <Link to="/login" className="text-primary hover:underline">
                {t("app.auth.backToLogin")}
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <AuthLogo />
          <CardTitle className="text-2xl">{t("app.auth.forgotPassword")}</CardTitle>
          <CardDescription>
            {t("app.auth.enterEmailForReset")}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("app.auth.email")}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t("app.auth.emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("common.loading") : t("app.auth.sendResetLink")}
            </Button>
            <div className="text-sm text-center text-muted-foreground">
              <Link to="/login" className="text-primary hover:underline">
                {t("app.auth.backToLogin")}
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
