import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Project } from '@/lib/types';
import { useLanguage } from '@/context/language-context';
import { getPaymentRequests, getProjects, getPaymentRequestHistory } from '@/lib/api/api-client';
import { useNavigate } from 'react-router-dom';
import { displayImage, revokeBlobUrl } from '@/lib/utils/image-utils';

const LeaderViewPayment = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [imageUrls, setImageUrls] = useState<{ [key: string]: string }>({});
  const [checkerNotes, setCheckerNotes] = useState<{ [paymentId: string]: string | null }>({});
  
  useEffect(() => {
    if (user) {
      // Load projects from API
      const fetchProjects = async () => {
        try {
          const allProjects = await getProjects();
          const userProjects = allProjects.filter(project => project.leader_id === Number(user.id));
          console.log('User Projects:', userProjects);
      setProjects(userProjects);
      
          // Load payment requests from API
          const payments = await getPaymentRequests(Number(user.id));
          console.log('Payment Requests:', payments);
          setPaymentRequests(payments);
          
          // Get unique project IDs from payments
          const projectIds = [...new Set(payments.map(payment => payment.project_id))];
          console.log('Project IDs from payments:', projectIds);
          
          // Filter projects to only those that have payments
          const projectsWithPayments = userProjects.filter(project => 
            projectIds.includes(project.id)
          );
          console.log('Projects with payments:', projectsWithPayments);
          
          setAvailableProjects(projectsWithPayments);
          
          // Set initial selected project if there are projects with payments
          if (projectsWithPayments.length > 0 && !selectedProject) {
        setSelectedProject('all');
      }
          
          // Fetch checker notes for each payment
          const notes: { [paymentId: string]: string | null } = {};
          for (const payment of payments) {
            try {
              const history = await getPaymentRequestHistory(Number(payment.id));
              const latestNote = history.find((h: any) => h.comment && h.comment.trim());
              notes[payment.id] = latestNote ? latestNote.comment : null;
            } catch {
              notes[payment.id] = null;
            }
          }
          setCheckerNotes(notes);
          
          // Load images for all payment requests
          await loadImagesForPayments(payments);
        } catch (error) {
          console.error('Error fetching data:', error);
        }
      };
      
      fetchProjects();
    }
  }, [user]);
  
  const loadImagesForPayments = async (payments: any[]) => {
    const newImageUrls: { [key: string]: string } = {};
    
    for (const payment of payments) {
      if (payment.image_ids && payment.image_ids.length > 0) {
        for (const imageId of payment.image_ids) {
          const key = `${payment.id}-${imageId}`;
          try {
            const imageUrl = await displayImage(imageId, 'payment-request');
            newImageUrls[key] = imageUrl;
          } catch (error) {
            console.error(`Error loading image ${imageId}:`, error);
          }
        }
      }
    }
    
    setImageUrls(newImageUrls);
  };
  
  // Cleanup blob URLs when component unmounts
  useEffect(() => {
    return () => {
      Object.values(imageUrls).forEach(url => {
        revokeBlobUrl(url);
      });
    };
  }, [imageUrls]);
  
  // Filter payment requests based on selected project
  const filteredPayments = selectedProject === 'all'
    ? paymentRequests.filter(payment => payment.user_id === user?.id)
    : paymentRequests.filter(payment => payment.project_id.toString() === selectedProject);
  
  const handleViewDetails = (payment: any) => {
    navigate(`/leader/payment/${payment.id}`);
  };
  
  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200">{t('app.payment.status.pending')}</Badge>;
      case 'approved':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200">{t('app.payment.status.approved')}</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 border-red-300 hover:bg-red-200">{t('app.payment.status.rejected')}</Badge>;
      case 'scheduled':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200">{t('app.payment.status.scheduled')}</Badge>;
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 border-green-300 hover:bg-green-200">{t('app.payment.status.paid')}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };
  
  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === parseInt(projectId));
    return project ? project.title : t('app.payment.unknownProject');
  };
  
  // Group payments by creation time
  const groupedPayments = filteredPayments.reduce((groups: Record<string, any[]>, payment: any) => {
    const date = new Date(payment.created_at).toISOString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(payment);
    return groups;
  }, {} as Record<string, any[]>);

  // Sort dates in descending order
  const sortedDates = Object.keys(groupedPayments).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-6">{t('app.payment.title')}</h1>
      <p className="text-muted-foreground mb-8">
        {t('app.payment.description')}
      </p>
      
      <div className="mb-6 max-w-md">
        <Label htmlFor="project-filter">{t('app.payment.filterByProject')}</Label>
        <Select
          value={selectedProject}
          onValueChange={setSelectedProject}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('app.payment.selectProject')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('app.payment.allProjects')}</SelectItem>
            {availableProjects.map((project) => (
              <SelectItem key={project.id} value={project.id.toString()}>{project.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="grid gap-6">
        {sortedDates.map((date) => {
          const payments = groupedPayments[date];
          const totalAmount = payments.reduce((sum: number, payment: any) => sum + (payment.total_amount || 0), 0);
          
          return (
            <Card key={date}>
            <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>{formatDate(date)}</CardTitle>
              <CardDescription>
                      {payments.length} {payments.length === 1 ? 'payment request' : 'payment requests'}
              </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">₹ {Number(totalAmount).toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">Total Amount</div>
                  </div>
                </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                  {payments.map((payment) => (
                    <div key={payment.id} className="border-b last:border-0 pb-4 last:pb-0">
                      <div className="flex justify-between items-start mb-2">
                <div>
                          <h3 className="font-medium">{payment.description}</h3>
                          <p className="text-sm text-muted-foreground">
                            {payment.expenses ? `${payment.expenses.length} expense(s)` : 'No expenses'}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">₹ {Number(payment.total_amount || 0).toFixed(2)}</div>
                  <div className="mt-1">{getStatusBadge(payment.status)}</div>
                          {(checkerNotes[payment.id] || payment.checkerNotes || payment.comment) && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Checker Notes: {checkerNotes[payment.id] || payment.checkerNotes || payment.comment}
                            </div>
                          )}
                        </div>
                </div>
                
                      {payment.image_ids && payment.image_ids.length > 0 && (
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {payment.image_ids.slice(0, 2).map((imageId: number, index: number) => {
                            const imageKey = `${payment.id}-${imageId}`;
                            const imageUrl = imageUrls[imageKey];
                            return (
                              <div key={index} className="w-full h-24 bg-gray-100 rounded-lg overflow-hidden">
                                {imageUrl ? (
                                  <img
                                    src={imageUrl}
                                    alt={`Payment proof ${index + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    Loading...
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      
                      <div className="mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(payment)}
                        >
                          {t('app.payment.viewDetails')}
                        </Button>
                      </div>
                  </div>
                  ))}
              </div>
            </CardContent>
          </Card>
          );
        })}
        
        {sortedDates.length === 0 && (
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle>{t('app.payment.noRequests')}</CardTitle>
              <CardDescription>
                {selectedProject === 'all' 
                  ? t('app.payment.noRequestsDescription')
                  : t('app.payment.noRequestsForProject')}
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button variant="outline" className="w-full" onClick={() => setSelectedProject('all')}>
                {t('app.payment.viewAllRequests')}
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
};

export default LeaderViewPayment;
