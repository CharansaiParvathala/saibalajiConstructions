import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getProjects, getPaymentRequests } from '@/lib/api/api-client';
import { Project, PaymentRequest } from '@/lib/types';
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/context/language-context';

const CheckerDashboard = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PaymentRequest[]>([]);
  const [approvedPayments, setApprovedPayments] = useState<PaymentRequest[]>([]);
  const [rejectedPayments, setRejectedPayments] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const projectsData = await getProjects();
        setProjects(projectsData);
        // If user is available, fetch payment requests
        const paymentRequestsData = await getPaymentRequests(user?.id ? Number(user.id) : undefined);
        setPendingPayments(paymentRequestsData.filter((p: PaymentRequest) => p.status === 'pending'));
        setApprovedPayments(paymentRequestsData.filter((p: PaymentRequest) => p.status === 'approved'));
        setRejectedPayments(paymentRequestsData.filter((p: PaymentRequest) => p.status === 'rejected'));
      } catch (err: any) {
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    if (user) {
      fetchData();
    }
  }, [user]);

  if (loading) {
    return <div className="container mx-auto p-4">{t('app.common.loading')}</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-red-500">{t('app.checker.dashboard.error')}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-6">{user?.name || 'Dashboard'}</h1>
      <p className="text-muted-foreground mb-8">
        {t('app.checker.dashboard.description')}
      </p>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('app.checker.dashboard.projects')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('app.checker.dashboard.projectsDescription')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('app.checker.dashboard.pendingRequests')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingPayments.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('app.checker.dashboard.pendingRequestsDescription')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('app.checker.dashboard.approvedRequests')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedPayments.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('app.checker.dashboard.approvedRequestsDescription')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('app.checker.dashboard.rejectedRequests')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rejectedPayments.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('app.checker.dashboard.rejectedRequestsDescription')}
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('app.checker.dashboard.reviewSubmissions')}</CardTitle>
            <CardDescription>
              {t('app.checker.dashboard.reviewSubmissionsDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {t('app.checker.dashboard.pendingCount', { count: pendingPayments.length })}
            </p>
          </CardContent>
          <CardFooter>
            <Link to="/checker/review-submissions" className="w-full">
              <Button className="w-full">{t('app.checker.dashboard.reviewNow')}</Button>
            </Link>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('app.checker.dashboard.reviewHistory')}</CardTitle>
            <CardDescription>
              {t('app.checker.dashboard.reviewHistoryDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {t('app.checker.dashboard.reviewedCount', { count: approvedPayments.length + rejectedPayments.length })}
            </p>
          </CardContent>
          <CardFooter>
            <Link to="/checker/review-history" className="w-full">
              <Button variant="outline" className="w-full">{t('app.checker.dashboard.viewHistory')}</Button>
            </Link>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('app.checker.dashboard.projects')}</CardTitle>
            <CardDescription>
              {t('app.checker.dashboard.projectsCardDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {t('app.checker.dashboard.projectsCardContent')}
            </p>
          </CardContent>
          <CardFooter>
            <Link to="/checker/projects" className="w-full">
              <Button variant="outline" className="w-full">{t('app.checker.dashboard.viewProjects')}</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default CheckerDashboard;
