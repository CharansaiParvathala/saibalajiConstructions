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
        setError(err.message || 'Failed to load payment requests');
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
        console.error('Error loading projects:', err.message || 'Failed to load projects');
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
      toast.success('Payment request approved successfully');
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Failed to approve payment request');
    }
  };
  
  const handleReject = async () => {
    if (!selectedRequest) return;
    
    if (!notes.trim()) {
      toast.error('Please provide notes explaining the rejection reason');
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
      toast.success('Payment request rejected successfully');
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject payment request');
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

  if (loading) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-6">Review Submissions</h1>
      <p className="text-muted-foreground mb-8">
        Review and validate payment requests submitted by project leaders.
      </p>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {pendingRequests.map((request) => {
          // Find the project for the current request
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
                  {/* Use a fallback for the date */}
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
                  onClick={e => handleViewDetails(request, e)}
                  className="flex-1"
                >
                  View Details
                </Button>
                <Button 
                  onClick={e => handleReview(request, e)}
                  className="flex-1"
                >
                  Review
                </Button>
              </CardFooter>
            </Card>
          );
        })}
        {pendingRequests.length === 0 && (
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle>No Pending Submissions</CardTitle>
              <CardDescription>
                No payment requests are currently pending for review.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
      
      {/* Payment Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="checker-dialog max-w-4xl">
          <div className="overflow-y-auto max-h-[75vh]">
            <DialogHeader>
              <DialogTitle>
                {/* Use selectedProject's title with a fallback */}
                {
                  selectedProject?.title ||
                  (selectedRequest && projects.find(p => p.id === Number(selectedRequest.projectId))?.title) ||
                  (selectedRequest ? `Project (${selectedRequest.projectId})` : 'Project')
                }
              </DialogTitle>
              <DialogDescription>
                {/* Use a fallback for the date */}
                Requested on {formatDate(selectedRequest?.date || selectedRequest?.created_at)}
              </DialogDescription>
            </DialogHeader>
            
            {selectedRequest && (
              <div className="space-y-6">
                {/* Main Payment Info Card */}
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{
                          selectedProject?.title ||
                          (selectedRequest && projects.find(p => p.id === Number(selectedRequest.projectId))?.title) ||
                          (selectedRequest ? `Project (${selectedRequest.projectId})` : 'Project')
                        }</CardTitle>
                        <CardDescription>
                          Requested on {formatDate(selectedRequest?.date || selectedRequest?.created_at)}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">₹ {Number(getTotalAmount()).toFixed(2)}</div>
                        <div className="text-sm text-muted-foreground">Total Amount</div>
                        <div className="mt-2">
                          <Badge>{selectedRequest.status}</Badge>
                          {selectedRequest.checkerNotes && (
                            <div className="text-sm text-muted-foreground mt-2">Checker Notes: {selectedRequest.checkerNotes}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                {/* Payment Expenses */}
                {selectedRequest.expenses && selectedRequest.expenses.length > 0 ? (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-semibold">Expense Details</h2>
                    {selectedRequest.expenses.map((expense, index) => (
                      <Card key={index}>
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg">{expense.type}</CardTitle>
                              <CardDescription>Expense #{index + 1}</CardDescription>
                            </div>
                            <div className="text-right">
                              <div className="text-xl font-bold">₹ {Number(expense.amount).toFixed(2)}</div>
                              <div className="text-sm text-muted-foreground">Amount</div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {/* Remarks */}
                            {expense.remarks && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Remarks</h4>
                                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">{expense.remarks}</p>
                              </div>
                            )}
                            {/* Images for this specific expense */}
                            {expense.image_ids && expense.image_ids.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Proof Images</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                  {expense.image_ids.map((imageId, imgIndex) => {
                                    const imageKey = `expense-${expense.id}-${imageId}`;
                                    const imageUrl = expenseImageUrls[imageKey];
                                    return (
                                      <div key={imgIndex} className="w-full h-48 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center text-gray-400">
                                        {imageUrl ? (
                                          <img src={imageUrl} alt={`Expense proof ${imgIndex + 1}`} className="w-full h-full object-cover" />
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
                        {/* Amount */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Amount</h4>
                          <p className="text-lg font-semibold text-gray-900">₹ {Number(getTotalAmount()).toFixed(2)}</p>
                        </div>
                        {/* Description/Remarks */}
                        {selectedRequest.description && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
                            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">{selectedRequest.description}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                    Close
                  </Button>
                  <Button onClick={() => {
                    setShowDetailsDialog(false);
                    handleReview(selectedRequest);
                  }}>
                    Review
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="checker-dialog max-w-md">
          <DialogHeader>
            <DialogTitle>Review Payment Request</DialogTitle>
            <DialogDescription>
              Approve or reject this payment request for ₹ {selectedRequest?.totalAmount}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add comments or notes about your decision"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          
          <DialogFooter className="flex gap-2 pt-4">
            <Button variant="destructive" onClick={handleReject}>
              Reject
            </Button>
            <Button onClick={handleApprove}>
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CheckerReviewSubmissions;
