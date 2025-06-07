import { useState, useEffect } from 'react';
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
  getAllPaymentRequests,
  updatePaymentRequest,
  getProjectById,
  getProgressUpdateById
} from '@/lib/storage';
import { PaymentRequest, Project, ProgressUpdate, PaymentPurpose } from '@/lib/types';

const CheckerReviewSubmissions = () => {
  const { user } = useAuth();
  const [pendingRequests, setPendingRequests] = useState<PaymentRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedProgress, setSelectedProgress] = useState<ProgressUpdate | null>(null);
  
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [notes, setNotes] = useState('');
  
  // Load pending requests on mount
  useEffect(() => {
    const requests = getAllPaymentRequests()
      .filter(request => request.status === 'pending')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setPendingRequests(requests);
  }, []);
  
  const handleViewDetails = (request: PaymentRequest) => {
    setSelectedRequest(request);
    
    // Get related project and progress update
    const project = getProjectById(request.projectId);
    setSelectedProject(project);
    
    const progressUpdate = getProgressUpdateById(request.progressUpdateId);
    setSelectedProgress(progressUpdate);
    
    setShowDetailsDialog(true);
  };
  
  const handleReview = (request: PaymentRequest) => {
    setSelectedRequest(request);
    setNotes('');
    setShowReviewDialog(true);
  };
  
  const handleApprove = () => {
    if (!selectedRequest) return;
    
    try {
      const updatedRequest = {
        ...selectedRequest,
        status: 'approved' as const,
        checkerNotes: notes
      };
      
      updatePaymentRequest(updatedRequest);
      
      // Update local state
      setPendingRequests(prevRequests => 
        prevRequests.filter(req => req.id !== selectedRequest.id)
      );
      
      setShowReviewDialog(false);
      toast.success('Payment request approved successfully');
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Failed to approve payment request');
    }
  };
  
  const handleReject = () => {
    if (!selectedRequest) return;
    
    if (!notes.trim()) {
      toast.error('Please provide notes explaining the rejection reason');
      return;
    }
    
    try {
      const updatedRequest = {
        ...selectedRequest,
        status: 'rejected' as const,
        checkerNotes: notes
      };
      
      updatePaymentRequest(updatedRequest);
      
      // Update local state
      setPendingRequests(prevRequests => 
        prevRequests.filter(req => req.id !== selectedRequest.id)
      );
      
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
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-6">Review Submissions</h1>
      <p className="text-muted-foreground mb-8">
        Review and validate payment requests submitted by project leaders.
      </p>
      
      <div className="grid gap-6 md:grid-cols-2">
        {pendingRequests.map((request) => {
          const project = getProjectById(request.projectId);
          return (
            <Card key={request.id}>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>{project?.name || 'Unknown Project'}</span>
                  <span className="text-lg font-normal">₹ {request.totalAmount}</span>
                </CardTitle>
                <CardDescription>
                  Submitted on {formatDate(request.date)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <p className="font-medium">Purposes</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {request.purposes.map((purpose, index) => (
                        <span
                          key={index}
                          className="px-2 py-0.5 bg-muted rounded-full text-xs"
                        >
                          {purpose.type} (₹ {purpose.amount})
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => handleViewDetails(request)}
                  className="flex-1"
                >
                  View Details
                </Button>
                <Button 
                  onClick={() => handleReview(request)}
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
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Payment Request Details</DialogTitle>
            <DialogDescription>
              Submitted on {selectedRequest && formatDate(selectedRequest.date)}
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Project Information</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Project:</span> {selectedProject?.name}</p>
                    <p><span className="font-medium">Date:</span> {formatDate(selectedRequest.date)}</p>
                    <p><span className="font-medium">Total Amount:</span> ₹ {selectedRequest.totalAmount}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Payment Purposes</h3>
                <div className="space-y-4">
                  {selectedRequest.purposes.map((purpose, index) => (
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
                              alt={`${purpose.type} image ${imgIndex + 1}`}
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
              
              {selectedProgress && selectedProgress.photos.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Progress Photos</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {selectedProgress.photos.slice(0, 3).map((photo, index) => (
                      <div key={index} className="relative">
                        <img
                          src={photo.dataUrl}
                          alt={`Progress photo ${index + 1}`}
                          className="w-full aspect-video object-cover rounded-md"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1">
                          {new Date(photo.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                  {selectedProgress.photos.length > 3 && (
                    <p className="text-xs mt-2 text-muted-foreground">
                      +{selectedProgress.photos.length - 3} more photos
                    </p>
                  )}
                </div>
              )}
              
              {selectedProgress && selectedProgress.photos.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Location Information</h3>
                  <MapView location={selectedProgress.photos[0].location} />
                </div>
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
        </DialogContent>
      </Dialog>
      
      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-md">
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
