import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/sonner';
import { getPaymentRequests, getProjectById, updatePaymentRequestStatus, getProjects } from '@/lib/api/api-client';
import { PaymentRequest, Project } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { displayImage, revokeBlobUrl } from '@/lib/utils/image-utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, addDays } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/context/language-context';

export default function OwnerPaymentQueue() {
  const { user } = useAuth();
  const [pendingRequests, setPendingRequests] = useState<PaymentRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expenseImageUrls, setExpenseImageUrls] = useState<{ [key: string]: string }>({});
  const prevExpenseImageUrls = useRef<{ [key: string]: string }>({});
  const [projects, setProjects] = useState<Project[]>([]);
  const detailsButtonRef = useRef<HTMLButtonElement | null>(null);
  const actionButtonRef = useRef<HTMLButtonElement | null>(null);
  const [allRequests, setAllRequests] = useState<PaymentRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const { t } = useLanguage();

  // Load pending requests on mount
  useEffect(() => {
    const fetchAllRequests = async () => {
      setLoading(true);
      setError(null);
      try {
        const all = await getPaymentRequests(user?.id ? Number(user.id) : 0);
        // Map backend fields to frontend fields
        const mapped = all.map(req => ({
          ...req,
          projectId: req.project_id ?? req.projectId,
          date: req.created_at ?? req.date,
          projectTitle: req.project_title ?? req.projectTitle,
          description: req.description ?? req.description,
          expenses: req.expenses?.map((expense: any) => ({
            ...expense,
            // Map image_ids to images for frontend compatibility
            images: expense.image_ids || [],
          })) || [],
          totalAmount: (typeof req.totalAmount === 'number' && !isNaN(req.totalAmount))
            ? req.totalAmount
            : (typeof req.total_amount === 'number' && !isNaN(req.total_amount))
              ? req.total_amount
              : (Array.isArray(req.expenses) ? req.expenses.reduce((sum: number, exp: any) => sum + (Number(exp.amount) || 0), 0) : 0),
        }));
        setAllRequests(mapped.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      } catch (err: any) {
        setError(err.message || 'Failed to load payment requests');
      } finally {
        setLoading(false);
      }
    };
    if (user) {
      fetchAllRequests();
    }
  }, [user]);

  // Load projects on mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const allProjects = await getProjects();
        setProjects(allProjects);
      } catch (err: any) {
        console.error('Error loading projects:', err.message || 'Failed to load projects');
      }
    };
    fetchProjects();
  }, []);

  const handleViewDetails = async (request: PaymentRequest, event?: React.MouseEvent<HTMLButtonElement>) => {
    setSelectedRequest(request);
    let project = null;
    const projectId = request.projectId;
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
        if (expense.images && expense.images.length > 0) {
          for (const imageId of expense.images) {
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
    console.log('View Details clicked. Setting expandedRequestId to:', String(request.id));
    setExpandedRequestId(String(request.id));
  };

  const handleAction = (request: PaymentRequest, event?: React.MouseEvent<HTMLButtonElement>) => {
    window.scrollTo({
      top: (document.body.scrollHeight - window.innerHeight) / 2,
      behavior: 'smooth',
    });
    if (event && event.currentTarget) {
      actionButtonRef.current = event.currentTarget;
      event.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setSelectedRequest(request);
    setShowActionDialog(true);
  };

  const handleConfirmPaid = async () => {
    if (!selectedRequest) return;
    try {
      await updatePaymentRequestStatus(Number(selectedRequest.id), 'paid');
      setPendingRequests(prev => prev.filter(req => req.id !== selectedRequest.id));
      setShowActionDialog(false);
      toast.success('Payment marked as paid');
    } catch (error) {
      console.error('Error marking as paid:', error);
      toast.error('Failed to mark as paid');
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Clean up blob URLs on dialog close
  useEffect(() => {
    if (!expandedRequestId) {
      Object.values(expenseImageUrls).forEach(revokeBlobUrl);
      setExpenseImageUrls({});
      prevExpenseImageUrls.current = {};
    }
  }, [expandedRequestId]);

  const getTotalAmount = () => {
    if (selectedRequest) {
      if (typeof selectedRequest.totalAmount === 'number' && selectedRequest.totalAmount > 0) {
        return selectedRequest.totalAmount;
      }
      // Fallback: sum expenses
      if (Array.isArray(selectedRequest.expenses) && selectedRequest.expenses.length > 0) {
        const sum = selectedRequest.expenses.reduce((acc, expense) => acc + (Number(expense.amount) || 0), 0);
        if (sum > 0) return sum;
      }
    }
    if (selectedProject && typeof selectedProject.total_work === 'number') {
      return selectedProject.total_work || 0;
    }
    return 0;
  };

  useEffect(() => {
    if (showActionDialog) {
      window.scrollTo(0, 0);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    // For inline expansion, scroll the expanded card into view
    if (expandedRequestId && cardRefs.current[expandedRequestId]) {
      cardRefs.current[expandedRequestId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [expandedRequestId, showActionDialog]);
        
  // Filter requests by status
  const filteredRequests = statusFilter === 'all'
    ? allRequests
    : allRequests.filter(req => req.status === statusFilter);

  if (loading) {
    return <div className="container mx-auto p-4">{t('app.owner.paymentQueue.loading')}</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-red-500">{t('app.owner.paymentQueue.error')}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-6">{t('app.owner.paymentQueue.title')}</h1>
      <p className="text-muted-foreground mb-8">
        {t('app.owner.paymentQueue.description')}
      </p>
      <div className="mb-6 max-w-xs">
        <Label htmlFor="status-filter">{t('app.owner.paymentQueue.filterByStatus')}</Label>
        <select
          id="status-filter"
          className="w-full p-2 border rounded bg-white dark:bg-[#23272f] dark:text-white"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="all">{t('app.owner.paymentQueue.allStatuses')}</option>
          <option value="pending">{t('app.owner.paymentQueue.pending')}</option>
          <option value="approved">{t('app.owner.paymentQueue.approved')}</option>
          <option value="rejected">{t('app.owner.paymentQueue.rejected')}</option>
          <option value="paid">{t('app.owner.paymentQueue.paid')}</option>
        </select>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredRequests.map((request) => {
          const projectId = request.projectId;
          const project = projects.find(p => p.id === Number(projectId));
          const isExpanded = expandedRequestId === String(request.id);
          return (
            <Card key={request.id} ref={el => (cardRefs.current[request.id] = el)}>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>{project?.title || `Project (${projectId})`}</span>
                  <span className="text-lg font-normal">₹ {request.totalAmount}</span>
                </CardTitle>
                <CardDescription>
                  Submitted on {formatDate(request.date)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <p className="font-medium">{t('app.owner.paymentQueue.expenses')}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {request.expenses && request.expenses.map((expense, index) => (
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
                {/* Inline expanded details */}
                {isExpanded && (
                  <div className="mt-6 border-t pt-4 max-h-80 overflow-y-auto rounded-lg shadow-inner bg-gray-50">
                    <div className="mb-4">
                      <h2 className="text-2xl font-bold">
                        {project?.title || `Project (${projectId})`}
                      </h2>
                      <div className="text-muted-foreground mb-2">
                        {request?.date ? `Requested on ${formatDate(request.date)}` : 'Unknown'}
                      </div>
                    </div>
                    <Card>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle>{project?.title || `Project (${projectId})`}</CardTitle>
                            <CardDescription>
                              {request?.date ? `Requested on ${formatDate(request.date)}` : 'Unknown'}
                            </CardDescription>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold">₹ {Number(request.totalAmount).toFixed(2)}</div>
                            <div className="text-sm text-muted-foreground">Total Amount</div>
                            <div className="mt-2">
                              <Badge>{request.status}</Badge>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                    {request.expenses && request.expenses.length > 0 ? (
                      <div className="space-y-6">
                        <h2 className="text-2xl font-semibold">{t('app.owner.paymentQueue.expenseDetails')}</h2>
                        {request.expenses.map((expense, index) => (
                          <Card key={index}>
                            <CardHeader>
                              <div className="flex justify-between items-start">
                                <div>
                                  <CardTitle className="text-lg">{expense.type}</CardTitle>
                                  <CardDescription>Expense #{index + 1}</CardDescription>
                                </div>
                                <div className="text-right">
                                  <div className="text-xl font-bold">₹ {Number(expense.amount).toFixed(2)}</div>
                                  <div className="text-sm text-muted-foreground">{t('app.owner.paymentQueue.amount')}</div>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                  <div>
                                  <h4 className="text-sm font-medium text-gray-700 mb-2">Remarks</h4>
                                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">{expense.remarks}</p>
                                  </div>
                                {expense.images && expense.images.length > 0 && (
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Proof Images</h4>
                                    <div className="flex flex-wrap gap-4 overflow-x-auto">
                                      {expense.images.map((imageId, imgIndex) => {
                                        const imageKey = `expense-${expense.id}-${imageId}`;
                                        const imageUrl = expenseImageUrls[imageKey];
                                        return (
                                          <div key={imgIndex} className="bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center text-gray-400 p-2">
                                            {imageUrl ? (
                                              <img src={imageUrl} alt={`Expense proof ${imgIndex + 1}`} style={{ maxWidth: '100%', height: 'auto', display: 'block' }} />
                                            ) : (
                                              <span>Loading...</span>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <Card>
                        <CardHeader>
                          <CardTitle>Payment Details</CardTitle>
                          <CardDescription>General payment information</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-2">Amount</h4>
                              <p className="text-lg font-semibold text-gray-900">₹ {Number(request.totalAmount).toFixed(2)}</p>
                            </div>
                            {request?.description && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
                                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">{request.description}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between gap-2">
                <Button
                  variant="outline"
                  onClick={e => {
                    if (isExpanded) {
                      setExpandedRequestId(null);
                    } else {
                      handleViewDetails(request, e);
                    }
                  }}
                  className="flex-1"
                >
                  {isExpanded ? t('app.owner.paymentQueue.hideDetails') : t('app.owner.paymentQueue.viewDetails')}
                </Button>
                {request.status === 'approved' && (
                  <Button
                    onClick={e => handleAction(request, e)}
                    className="flex-1"
                  >
                    {t('app.owner.paymentQueue.confirm')}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
        {filteredRequests.length === 0 && (
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle>{t('app.owner.paymentQueue.noPayments')}</CardTitle>
              <CardDescription>
                {t('app.owner.paymentQueue.noPaymentsDesc')}
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
      {/* Action Dialog (Schedule or Confirm Paid) */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="checker-dialog max-w-md">
          <DialogHeader>
            <DialogTitle>{t('app.owner.paymentQueue.processPaymentRequest')}</DialogTitle>
            <DialogDescription>
              {selectedRequest?.status === 'approved'
                ? t('app.owner.paymentQueue.confirmAsPaid')
                : t('app.owner.paymentQueue.canConfirmAsPaid')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
          </div>
          <DialogFooter className="flex gap-2 pt-4">
            {selectedRequest?.status === 'approved' && (
              <Button onClick={handleConfirmPaid}>
                {t('app.owner.paymentQueue.confirmPaid')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
