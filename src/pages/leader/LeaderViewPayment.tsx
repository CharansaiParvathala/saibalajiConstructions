import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { getProjectsByLeaderId, getAllPaymentRequests, getProjectById } from '@/lib/storage';
import { Project, PaymentRequest } from '@/lib/types';
import { useLanguage } from '@/context/language-context';

const LeaderViewPayment = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRequest | null>(null);
  const [showDialog, setShowDialog] = useState<boolean>(false);
  
  useEffect(() => {
    if (user) {
      const userProjects = getProjectsByLeaderId(user.id);
      setProjects(userProjects);
      
      // Load all payment requests
      const allPayments = getAllPaymentRequests();
      const userPayments = allPayments.filter(payment => 
        userProjects.some(project => project.id === payment.projectId)
      ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setPaymentRequests(userPayments);
      
      if (userProjects.length > 0 && !selectedProject) {
        setSelectedProject('all');
      }
    }
  }, [user]);
  
  // Filter payment requests based on selected project
  const filteredPayments = selectedProject === 'all'
    ? paymentRequests
    : paymentRequests.filter(payment => payment.projectId === selectedProject);
  
  const handleViewPayment = (payment: PaymentRequest) => {
    setSelectedPayment(payment);
    setShowDialog(true);
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
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : t('app.payment.unknownProject');
  };
  
  return (
    <div className="container mx-auto p-4">
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
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        {filteredPayments.map((payment) => (
          <Card key={payment.id}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>{getProjectName(payment.projectId)}</span>
                <span className="text-lg font-normal">₹ {payment.totalAmount}</span>
              </CardTitle>
              <CardDescription>
                {t('app.payment.requestedOn')} {formatDate(payment.date)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="font-medium">{t('app.payment.status')}</p>
                  <div className="mt-1">{getStatusBadge(payment.status)}</div>
                </div>
                
                <div>
                  <p className="font-medium">{t('app.payment.purposes')}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {payment.purposes.map((purpose, index) => (
                      <span
                        key={index}
                        className="px-2 py-0.5 bg-muted rounded-full text-xs"
                      >
                        {purpose.type} (₹ {purpose.amount})
                      </span>
                    ))}
                  </div>
                </div>
                
                {payment.checkerNotes && (
                  <div>
                    <p className="font-medium">{t('app.payment.checkerNotes')}</p>
                    <p className="text-sm text-muted-foreground">{payment.checkerNotes}</p>
                  </div>
                )}
                
                {payment.scheduledDate && payment.status === 'scheduled' && (
                  <div>
                    <p className="font-medium">{t('app.payment.scheduledFor')}</p>
                    <p className="text-sm text-muted-foreground">{formatDate(payment.scheduledDate)}</p>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => handleViewPayment(payment)}
              >
                {t('app.payment.viewDetails')}
              </Button>
            </CardFooter>
          </Card>
        ))}
        
        {filteredPayments.length === 0 && (
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle>{t('app.payment.noRequests')}</CardTitle>
              <CardDescription>
                {t('app.payment.noRequestsDescription')}
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
      
      {/* Payment Details Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t('app.payment.details.title')}</DialogTitle>
            <DialogDescription>
              {t('app.payment.details.requestedOn')} {selectedPayment && formatDate(selectedPayment.date)}
            </DialogDescription>
          </DialogHeader>
          
          {selectedPayment && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">{t('app.payment.details.projectInfo')}</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">{t('app.payment.details.project')}:</span> {getProjectName(selectedPayment.projectId)}</p>
                    <p><span className="font-medium">{t('app.payment.details.date')}:</span> {formatDate(selectedPayment.date)}</p>
                    <p><span className="font-medium">{t('app.payment.details.totalAmount')}:</span> ₹ {selectedPayment.totalAmount}</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">{t('app.payment.details.statusInfo')}</h3>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="font-medium">{t('app.payment.details.currentStatus')}:</span>{' '}
                      {getStatusBadge(selectedPayment.status)}
                    </p>
                    {selectedPayment.checkerNotes && (
                      <p>
                        <span className="font-medium">{t('app.payment.details.checkerNotes')}:</span>{' '}
                        {selectedPayment.checkerNotes}
                      </p>
                    )}
                    {selectedPayment.scheduledDate && selectedPayment.status === 'scheduled' && (
                      <p>
                        <span className="font-medium">{t('app.payment.details.scheduledFor')}:</span>{' '}
                        {formatDate(selectedPayment.scheduledDate)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">{t('app.payment.details.paymentPurposes')}</h3>
                <div className="space-y-4">
                  {selectedPayment.purposes.map((purpose, index) => (
                    <div key={index} className="border rounded-md p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium capitalize">{purpose.type}</h4>
                        <span>₹ {purpose.amount}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {purpose.images.map((image, imgIndex) => (
                          <div key={imgIndex} className="relative">
                            <img
                              src={image.dataUrl}
                              alt={`${purpose.type} ${t('app.payment.details.image')} ${imgIndex + 1}`}
                              className="w-full aspect-video object-cover rounded-md"
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1">
                              {new Date(image.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeaderViewPayment;
