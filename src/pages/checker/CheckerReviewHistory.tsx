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
import { MapView } from '@/components/shared/map-view';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  getAllPaymentRequests,
  getProjectById,
  getProgressUpdateById
} from '@/lib/storage';
import { PaymentRequest, Project, ProgressUpdate } from '@/lib/types';

const CheckerReviewHistory = () => {
  const { user } = useAuth();
  const [reviewedRequests, setReviewedRequests] = useState<PaymentRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<PaymentRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedProgress, setSelectedProgress] = useState<ProgressUpdate | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  
  useEffect(() => {
    // Get all payment requests that have been reviewed (not pending)
    const requests = getAllPaymentRequests()
      .filter(request => request.status !== 'pending')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    setReviewedRequests(requests);
    setFilteredRequests(requests);
  }, []);
  
  // Filter requests based on status
  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredRequests(reviewedRequests);
    } else {
      setFilteredRequests(reviewedRequests.filter(req => req.status === statusFilter));
    }
  }, [statusFilter, reviewedRequests]);
  
  const handleViewDetails = (request: PaymentRequest) => {
    setSelectedRequest(request);
    
    // Get related project and progress update
    const project = getProjectById(request.projectId);
    setSelectedProject(project);
    
    if (request.progressUpdateId) {
      const progressUpdate = getProgressUpdateById(request.progressUpdateId);
      setSelectedProgress(progressUpdate);
    } else {
      setSelectedProgress(null);
    }
    
    setShowDetailsDialog(true);
  };
  
  const getStatusBadge = (status: string) => {
    switch(status) {
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
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-6">Review History</h1>
      <p className="text-muted-foreground mb-8">
        View your past payment request reviews and decisions.
      </p>
      
      <div className="mb-6 max-w-xs">
        <Label htmlFor="status-filter">Filter by Status</Label>
        <Select
          value={statusFilter}
          onValueChange={setStatusFilter}
        >
          <SelectTrigger id="status-filter">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredRequests.map((request) => {
          const project = getProjectById(request.projectId);
          return (
            <Card key={request.id}>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>{project?.name || 'Unknown Project'}</CardTitle>
                  {getStatusBadge(request.status)}
                </div>
                <CardDescription>
                  Reviewed on {formatDate(request.date)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="font-medium">Amount</p>
                    <p className="text-2xl">₹ {request.totalAmount}</p>
                  </div>
                  
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
                  
                  {request.checkerNotes && (
                    <div>
                      <p className="font-medium">Your Notes</p>
                      <p className="text-sm text-muted-foreground">{request.checkerNotes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  variant="outline"
                  className="w-full"
                  onClick={() => handleViewDetails(request)}
                >
                  View Details
                </Button>
              </CardFooter>
            </Card>
          );
        })}
        
        {filteredRequests.length === 0 && (
          <Card className="col-span-full">
            <CardHeader>
              <CardTitle>No Review History</CardTitle>
              <CardDescription>
                No payment requests match the selected filter.
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
              Reviewed on {selectedRequest && formatDate(selectedRequest.date)}
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
                
                <div>
                  <h3 className="font-semibold mb-2">Status Information</h3>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="font-medium">Current Status:</span>{' '}
                      {getStatusBadge(selectedRequest.status)}
                    </p>
                    {selectedRequest.checkerNotes && (
                      <p>
                        <span className="font-medium">Your Notes:</span>{' '}
                        {selectedRequest.checkerNotes}
                      </p>
                    )}
                    {selectedRequest.scheduledDate && selectedRequest.status === 'scheduled' && (
                      <p>
                        <span className="font-medium">Payment Scheduled For:</span>{' '}
                        {formatDate(selectedRequest.scheduledDate)}
                      </p>
                    )}
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
              
              {selectedProgress && selectedProgress.photos.length > 0 && selectedProgress.photos[0].location && (
                <div>
                  <h3 className="font-semibold mb-2">Location Information</h3>
                  <MapView location={selectedProgress.photos[0].location} />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CheckerReviewHistory;
