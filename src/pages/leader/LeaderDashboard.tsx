import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { getProjectsByLeaderId, getAllPaymentRequests } from '@/lib/storage';
import { Project, PaymentRequest } from '@/lib/types';
import { useLanguage } from '@/context/language-context';
import { format } from 'date-fns';
import { CheckCircle } from 'lucide-react';

const LeaderDashboard = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [recentPayments, setRecentPayments] = useState<PaymentRequest[]>([]);
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    if (user) {
      const userProjects = getProjectsByLeaderId(user.id);
      setProjects(userProjects);
      
      // Use getAllPaymentRequests and filter by leaderId instead
      const allPayments = getAllPaymentRequests();
      const leaderPayments = allPayments
        .filter(payment => 
          userProjects.some(project => project.id === payment.projectId)
        )
        .slice(0, 3);
      setRecentPayments(leaderPayments);
    }
  }, [user]);

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Pending</Badge>;
      case 'approved':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 border-red-300">Rejected</Badge>;
      case 'scheduled':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-300">Scheduled</Badge>;
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 border-green-300">Paid</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const calculateProgress = (project: Project) => {
    if (project.totalWork === 0) return 0;
    return Math.min(100, Math.round((project.completedWork / project.totalWork) * 100));
  };

  const hasCompletedProjects = projects.some(project => project.completedWork >= project.totalWork);

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-4xl font-bold">{t('app.dashboard.title')}</h1>
          <p className="text-muted-foreground">
            {t('app.dashboard.description')}
          </p>
        </div>
        {hasCompletedProjects && (
          <Button 
            onClick={() => navigate('/leader/final-submission')}
            className="flex items-center gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            Final Project Submission
          </Button>
        )}
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>{t('app.leader.dashboard.totalProjects')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{projects.length}</p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" onClick={() => navigate('/leader/create-project')}>
              Create New Project
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>{t('app.leader.dashboard.trackProgress.title')}</CardTitle>
            <CardDescription>{t('app.leader.dashboard.trackProgress.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/leader/add-progress')}
              className="w-full"
            >
              {t('app.leader.dashboard.trackProgress.button')}
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>{t('app.leader.dashboard.paymentRequests.title')}</CardTitle>
            <CardDescription>{t('app.leader.dashboard.paymentRequests.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/leader/request-payment')}
              className="w-full"
            >
              {t('app.leader.dashboard.paymentRequests.button')}
            </Button>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('app.leader.dashboard.projects.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <div className="text-center py-8">
                <h3 className="text-lg font-semibold mb-2">{t('app.leader.dashboard.projects.empty.title')}</h3>
                <p className="text-muted-foreground mb-4">{t('app.leader.dashboard.projects.empty.description')}</p>
                <Button onClick={() => navigate('/leader/create-project')} className="w-full">
                  {t('app.leader.dashboard.projects.empty.button')}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {projects.map((project) => (
                  <Card key={project.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{project.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {t('app.common.createdOn')} {format(new Date(project.createdAt), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => navigate(`/leader/view-progress/${project.id}`)}>
                          {t('app.common.viewDetails')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>{t('app.leader.dashboard.recentPayments.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            {recentPayments.length === 0 ? (
              <div className="text-center py-8">
                <h3 className="text-lg font-semibold mb-2">{t('app.leader.dashboard.recentPayments.empty.title')}</h3>
                <p className="text-muted-foreground">{t('app.leader.dashboard.recentPayments.empty.description')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentPayments.map((payment) => (
                  <Card key={payment.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">₹{payment.totalAmount}</h3>
                          <p className="text-sm text-muted-foreground">
                            {t('app.common.requestedOn')} {format(new Date(payment.date), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                            payment.status === 'approved' ? 'bg-green-100 text-green-800' :
                            payment.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {t(`app.common.status.${payment.status}`)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LeaderDashboard;
