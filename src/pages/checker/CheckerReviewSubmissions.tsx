import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { MapView } from '@/components/shared/map-view';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/sonner';
import {
  getPaymentRequests,
  getProjectById,
  updatePaymentRequestStatus,
  getProjects,
  // getProgressUpdateById (not available in API client, so skip for now)
} from '@/lib/api/api-client';
import { PaymentRequest, Project } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { displayImage, revokeBlobUrl } from '@/lib/utils/image-utils';
import { useLanguage } from '@/context/language-context';
import { useNavigate } from 'react-router-dom';

const CheckerReviewSubmissions = () => {
  const { user } = useAuth();
  const [pendingRequests, setPendingRequests] = useState<PaymentRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  // const [selectedProgress, setSelectedProgress] = useState<ProgressUpdate | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expenseImageUrls, setExpenseImageUrls] = useState<{ [key: string]: string }>({});
  const prevExpenseImageUrls = useRef<{ [key: string]: string }>({});
  const [projects, setProjects] = useState<Project[]>([]);
  const detailsButtonRef = useRef<HTMLButtonElement | null>(null);
  const reviewButtonRef = useRef<HTMLButtonElement | null>(null);
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Load pending requests on mount
  useEffect(() => {
    const fetchPendingRequests = async () => {
      setLoading(true);
      setError(null);
      try {
        const allRequests = await getPaymentRequests(user?.id ? Number(user.id) : undefined);
        const pending = allRequests.filter((request: PaymentRequest) => request.status === 'pending')
          .sort((a: PaymentRequest, b: PaymentRequest) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setPendingRequests(pending);
      } catch (err: any) {
        setError(err.message || t('app.checker.reviewSubmissions.errorLoading'));
      } finally {
        setLoading(false);
      }
    };
    if (user) {
      fetchPendingRequests();
    }
  }, [user]);

  // Load projects on mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const allProjects = await getProjects();
        setProjects(allProjects);
      } catch (err: any) {
        console.error('Error loading projects:', err.message || t('app.checker.reviewSubmissions.errorLoadingProjects'));
      }
    };
    fetchProjects();
  }, []);

  const handleViewDetails = async (request: PaymentRequest, event?: React.MouseEvent<HTMLButtonElement>) => {
    window.scrollTo({
      top: (document.body.scrollHeight - window.innerHeight) / 2,
      behavior: 'smooth',
    });
    if (event && event.currentTarget) {
      detailsButtonRef.current = event.currentTarget;
      event.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setSelectedRequest(request);
    let project = null;
    const projectId = request.projectId || request.project_id;
    if (projectId && !isNaN(Number(projectId))) {
      try {
        project = await getProjectById(Number(projectId));
        setSelectedProject(project);
      } catch {
        setSelectedProject(null);
      }
    } else {
      setSelectedProject(null);
    }
    // Fetch images for each expense
    const newImageUrls: { [key: string]: string } = {};
    if (request.expenses) {
      for (const expense of request.expenses) {
        if (expense.image_ids && expense.image_ids.length > 0) {
          for (const imageId of expense.image_ids) {
            const key = `expense-${expense.id}-${imageId}`;
            try {
              const url = await displayImage(imageId, 'payment-request');
              newImageUrls[key] = url;
            } catch {
              newImageUrls[key] = '';
            }
          }
        }
      }
    }
    Object.values(prevExpenseImageUrls.current).forEach(revokeBlobUrl);
    setExpenseImageUrls(newImageUrls);
    prevExpenseImageUrls.current = newImageUrls;
    setShowDetailsDialog(true);
  };

  const handleReview = (request: PaymentRequest, event?: React.MouseEvent<HTMLButtonElement>) => {
    window.scrollTo({
      top: (document.body.scrollHeight - window.innerHeight) / 2,
      behavior: 'smooth',
    });
    if (event && event.currentTarget) {
      reviewButtonRef.current = event.currentTarget;
      event.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setSelectedRequest(request);
    setNotes('');
    setShowReviewDialog(true);
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    try {
      // Call API to update status and checker notes
      const updated = await updatePaymentRequestStatus(
        Number(selectedRequest.id),
        'approved',
        notes // send notes as comment
      );
      // Update local state for selectedRequest
      setSelectedRequest({ ...selectedRequest, status: 'approved', checkerNotes: notes });
      // Optionally update pendingRequests to remove or update the approved request
      setPendingRequests(prev => prev.filter(req => req.id !== selectedRequest.id));
      setShowReviewDialog(false);
      toast.success(t('app.checker.reviewSubmissions.approveSuccess'));
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error(t('app.checker.reviewSubmissions.approveError'));
    }
  };
  
  const handleReject = async () => {
    if (!selectedRequest) return;
    
    if (!notes.trim()) {
      toast.error(t('app.checker.reviewSubmissions.rejectionNotesRequired'));
      return;
    }
    
    try {
      // Call API to update status and checker notes
      await updatePaymentRequestStatus(
        Number(selectedRequest.id),
        'rejected',
        notes // send notes as comment
      );
      // Update local state for selectedRequest
      setSelectedRequest({ ...selectedRequest, status: 'rejected', checkerNotes: notes });
      setPendingRequests(prev => prev.filter(req => req.id !== selectedRequest.id));
      setShowReviewDialog(false);
      toast.success(t('app.checker.reviewSubmissions.rejectSuccess'));
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error(t('app.checker.reviewSubmissions.rejectError'));
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Clean up blob URLs on dialog close
  useEffect(() => {
    if (!showDetailsDialog) {
      Object.values(expenseImageUrls).forEach(revokeBlobUrl);
      setExpenseImageUrls({});
      prevExpenseImageUrls.current = {};
    }
  }, [showDetailsDialog]);

  const getTotalAmount = () => {
    if (selectedRequest) {
      if (typeof selectedRequest.totalAmount === 'number' && selectedRequest.totalAmount > 0) {
        return selectedRequest.totalAmount;
      }
      if (typeof selectedRequest.total_amount === 'number' && selectedRequest.total_amount > 0) {
        return selectedRequest.total_amount;
      }
      // Fallback: sum expenses
      if (Array.isArray(selectedRequest.expenses) && selectedRequest.expenses.length > 0) {
        const sum = selectedRequest.expenses.reduce((acc, expense) => acc + (Number(expense.amount) || 0), 0);
        if (sum > 0) return sum;
      }
    }
    if (selectedProject && typeof selectedProject.total_amount === 'number' && selectedProject.total_amount > 0) {
      return selectedProject.total_amount;
    }
    return 0;
  };

  useEffect(() => {
    if (showDetailsDialog || showReviewDialog) {
      window.scrollTo(0, 0);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showDetailsDialog, showReviewDialog]);

  useEffect(() => {
    if (!expandedRequestId) {
      // Clean up blob URLs when no card is expanded
      Object.values(expenseImageUrls).forEach(revokeBlobUrl);
      setExpenseImageUrls({});
      prevExpenseImageUrls.current = {};
      return;
    }

    // Find the expanded request
    const request = pendingRequests.find(req => String(req.id) === expandedRequestId);
    if (!request) return;

    // Fetch images for each expense
    const fetchImages = async () => {
      const newImageUrls: { [key: string]: string } = {};
      if (request.expenses) {
        for (const expense of request.expenses) {
          if (expense.image_ids && expense.image_ids.length > 0) {
            for (const imageId of expense.image_ids) {
              const key = `expense-${expense.id}-${imageId}`;
              try {
                const url = await displayImage(imageId, 'payment-request');
                newImageUrls[key] = url;
              } catch {
                newImageUrls[key] = '';
              }
            }
          }
        }
      }
      Object.values(prevExpenseImageUrls.current).forEach(revokeBlobUrl);
      setExpenseImageUrls(newImageUrls);
      prevExpenseImageUrls.current = newImageUrls;
    };

    fetchImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedRequestId]);

  if (loading) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-6">{t('app.checker.reviewSubmissions.title')}</h1>
      <p className="text-muted-foreground mb-8">
        {t('app.checker.reviewSubmissions.description')}
      </p>
      <div className="w-full max-w-6xl mx-auto">
        {pendingRequests.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-lg font-semibold mb-2">{t('app.checker.reviewSubmissions.noPendingTitle')}</h2>
            <p className="text-muted-foreground">{t('app.checker.reviewSubmissions.noPendingDescription')}</p>
          </div>
        ) : (
          pendingRequests.map((request) => {
            const projectId = request.projectId || request.project_id;
            const project = projects.find(p => p.id === Number(projectId));
            return (
              <Card key={request.id}>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>{project?.title || `Project (${projectId})`}</span>
                    <span className="text-lg font-normal">₹ {request.totalAmount}</span>
                  </CardTitle>
                  <CardDescription>
                    Submitted on {formatDate(request.date || request.created_at)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <p className="font-medium">Expenses</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {request.expenses.map((expense, index) => (
                          <span
                            key={index}
                            className="px-2 py-0.5 bg-muted rounded-full text-xs"
                          >
                            {expense.type} (₹ {expense.amount})
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between gap-2">
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/checker/review-submissions/${request.id}`)}
                    className="flex-1"
                  >
                    View Details
                  </Button>
                </CardFooter>
              </Card>
            );
          })
        )}
      </div>
      
      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="checker-dialog max-w-md">
          <DialogHeader>
            <DialogTitle>{t('app.checker.reviewSubmissions.reviewDialogTitle')}</DialogTitle>
            <DialogDescription>
              {t('app.checker.reviewSubmissions.reviewDialogDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">{t('app.checker.reviewSubmissions.checkerNotes')}</Label>
              <Textarea
                id="notes"
                placeholder={t('app.checker.reviewSubmissions.notesPlaceholder')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          
          <DialogFooter className="flex gap-2 pt-4">
            <Button variant="outline" onClick={handleReject}>{t('app.checker.reviewSubmissions.reject')}</Button>
            <Button onClick={handleApprove}>{t('app.checker.reviewSubmissions.approve')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CheckerReviewSubmissions;
