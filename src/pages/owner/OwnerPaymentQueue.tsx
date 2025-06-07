import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, addDays, isBefore } from 'date-fns';
import { CalendarIcon, Check, Clock } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/context/language-context';
import { Badge } from '@/components/ui/badge';

import { getAllPaymentRequests, getProjectById, updatePaymentRequest } from '@/lib/storage';
import { PaymentRequest, Project } from '@/lib/types';

export default function OwnerPaymentQueue() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<PaymentRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending'>('all');
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);
  const [scheduledDate, setScheduledDate] = useState<Date>(addDays(new Date(), 1));
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Load payment requests
  useEffect(() => {
    const requests = getAllPaymentRequests();
    setPaymentRequests(requests);
    setFilteredRequests(requests);
  }, []);

  // Filter payment requests
  useEffect(() => {
    let filtered = paymentRequests;

    if (filter === 'pending') {
      filtered = filtered.filter(req => req.status === 'pending');
    } else if (filter === 'approved') {
      filtered = filtered.filter(req => req.status === 'approved');
    }

    if (searchTerm) {
      filtered = filtered.filter(req => {
        const project = getProjectById(req.projectId);
        return (
          project?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          req.id.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    setFilteredRequests(filtered);
  }, [paymentRequests, filter, searchTerm]);

  // Function to pay immediately
  const handlePayNow = () => {
    if (!selectedRequest) return;
    
    setIsProcessing(true);
    
    try {
      // Using the correct type for status
      const updatedRequest: PaymentRequest = {
        ...selectedRequest,
        status: 'paid'
      };
      
      updatePaymentRequest(updatedRequest);
      
      toast.success(t('owner.paymentQueue.paymentMarkedAsPaid'), {
        description: `Payment #${selectedRequest.id} has been marked as paid.`
      });
      
      // Update state
      setPaymentRequests(prev => 
        prev.map(req => req.id === updatedRequest.id ? updatedRequest : req)
      );
      setSelectedRequest(null);
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Payment processing error:", error);
      toast.error(t('common.error'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Function to schedule payment
  const handleSchedulePayment = () => {
    if (!selectedRequest || !scheduledDate) return;
    
    setIsProcessing(true);
    
    try {
      // Using the correct type for status
      const updatedRequest: PaymentRequest = {
        ...selectedRequest,
        status: 'scheduled',
        scheduledDate: scheduledDate.toISOString(),
      };
      
      updatePaymentRequest(updatedRequest);
      
      toast.success(t('owner.paymentQueue.paymentScheduled'), {
        description: `Payment #${selectedRequest.id} has been scheduled for ${format(scheduledDate, 'PPP')}.`
      });
      
      // Update state
      setPaymentRequests(prev => 
        prev.map(req => req.id === updatedRequest.id ? updatedRequest : req)
      );
      setSelectedRequest(null);
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Payment scheduling error:", error);
      toast.error(t('common.error'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Function to handle request selection and open dialog
  const selectRequest = (request: PaymentRequest) => {
    setSelectedRequest(request);
    setIsDialogOpen(true);
  };

  // Function to get project name
  const getProjectName = (projectId: string): string => {
    const project = getProjectById(projectId);
    return project?.name || t('owner.projects.unknown');
  };

  const handleStatusChange = async (requestId: string, newStatus: 'approved' | 'rejected' | 'paid') => {
    try {
      const updatedRequest = updatePaymentRequest(requestId, newStatus);
      if (updatedRequest) {
        setPaymentRequests(prev => 
          prev.map(request => 
            request.id === requestId ? updatedRequest : request
          )
        );
        
        // Show success message
        if (newStatus === 'approved') {
          toast.success(t('owner.paymentQueue.paymentApproved'));
        } else if (newStatus === 'rejected') {
          toast.success(t('owner.paymentQueue.paymentRejected'));
        } else if (newStatus === 'paid') {
          toast.success(t('owner.paymentQueue.paymentMarkedAsPaid'));
        }
        
        // Close dialog
        setIsDialogOpen(false);
      }
    } catch (error) {
      console.error('Error updating payment request:', error);
      toast.error(t('common.error'));
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">{t('owner.paymentQueue.title')}</h1>
        <p className="text-muted-foreground">
          {t('owner.paymentQueue.description')}
        </p>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <Input
          placeholder={t('owner.paymentQueue.searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
            size="sm"
          >
            {t('owner.paymentQueue.all')}
          </Button>
          <Button
            variant={filter === 'approved' ? 'default' : 'outline'}
            onClick={() => setFilter('approved')}
            size="sm"
          >
            {t('owner.paymentQueue.approved')}
          </Button>
          <Button
            variant={filter === 'pending' ? 'default' : 'outline'}
            onClick={() => setFilter('pending')}
            size="sm"
          >
            {t('owner.paymentQueue.pending')}
          </Button>
        </div>
      </div>
      
      {filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <p className="text-muted-foreground">No payment requests found.</p>
            <p className="text-sm text-muted-foreground">
              {filter === 'approved'
                ? "There are no approved payment requests waiting to be processed."
                : filter === 'pending'
                  ? "There are no pending payment requests."
                  : "There are no payment requests in the system."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredRequests.map((request) => {
            const project = getProjectById(request.projectId);
            const totalAmount = request.totalAmount;
            
            return (
              <Card key={request.id} className="overflow-hidden">
                <CardHeader className="bg-muted/50">
                  <CardTitle className="flex justify-between items-start">
                    <span>{getProjectName(request.projectId)}</span>
                    <Badge variant={request.status === 'approved' ? 'default' : 'secondary'}>
                      {request.status}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {t('owner.paymentQueue.date')}: {format(new Date(request.date), 'PPP')}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium">{t('owner.paymentQueue.paymentDetails')}</h3>
                      <div className="mt-1 grid grid-cols-2 gap-1 text-sm">
                        <span className="text-muted-foreground">{t('owner.paymentQueue.amount')}:</span>
                        <span className="font-medium text-right">₹{totalAmount.toFixed(2)}</span>
                        <span className="text-muted-foreground">{t('owner.paymentQueue.purposes')}:</span>
                        <span className="text-right">
                          {request.purposes.map(p => p.type).join(', ')}
                        </span>
                        <span className="text-muted-foreground">{t('owner.paymentQueue.status')}:</span>
                        <span className="text-right capitalize">{request.status}</span>
                        {request.scheduledDate && (
                          <>
                            <span className="text-muted-foreground">{t('owner.paymentQueue.scheduledFor')}:</span>
                            <span className="text-right">
                              {format(new Date(request.scheduledDate), 'PPP')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {request.status === 'approved' && (
                      <Button 
                        className="w-full" 
                        onClick={() => selectRequest(request)}
                      >
                        {t('owner.paymentQueue.viewDetails')}
                      </Button>
                    )}
                    
                    {(request.status === 'scheduled' || request.status === 'paid') && (
                      <div className="flex items-center justify-center py-2 gap-2 text-muted-foreground">
                        {request.status === 'scheduled' ? (
                          <>
                            <Clock className="h-4 w-4" />
                            <span>{t('owner.paymentQueue.scheduledFor')}: {format(new Date(request.scheduledDate!), 'PPP')}</span>
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4" />
                            <span>{t('owner.paymentQueue.paymentComplete')}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      
      {/* Payment Process Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('owner.paymentQueue.paymentDetails')}</DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <>
                  <p>{getProjectName(selectedRequest.projectId)}</p>
                  <p>{t('owner.paymentQueue.date')}: {format(new Date(selectedRequest.date), 'PPP')}</p>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <h3 className="font-medium">{t('owner.paymentQueue.paymentDetails')}</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">{t('owner.paymentQueue.amount')}:</span>
                  <span className="font-medium">₹{selectedRequest.totalAmount.toFixed(2)}</span>
                  <span className="text-muted-foreground">{t('owner.paymentQueue.purposes')}:</span>
                  <span className="text-right">
                    {selectedRequest.purposes.map(p => p.type).join(', ')}
                  </span>
                  <span className="text-muted-foreground">{t('owner.paymentQueue.status')}:</span>
                  <span className="text-right capitalize">{selectedRequest.status}</span>
                  {selectedRequest.scheduledDate && (
                    <>
                      <span className="text-muted-foreground">{t('owner.paymentQueue.scheduledFor')}:</span>
                      <span className="text-right">
                        {format(new Date(selectedRequest.scheduledDate), 'PPP')}
                      </span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="scheduled-date">{t('owner.paymentQueue.scheduleForLater')}</Label>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {scheduledDate ? format(scheduledDate, 'PPP') : <span>{t('owner.paymentQueue.pickADate')}</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={scheduledDate}
                      onSelect={(date) => {
                        if (date) {
                          setScheduledDate(date);
                          setIsCalendarOpen(false);
                        }
                      }}
                      disabled={(date) => 
                        isBefore(date, new Date()) || 
                        isBefore(date, new Date().setHours(0, 0, 0, 0))
                      }
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex sm:justify-between">
            <Button
              variant="outline"
              onClick={() => handlePayNow()}
              disabled={isProcessing}
            >
              {t('owner.paymentQueue.payNow')}
            </Button>
            <Button
              onClick={() => handleSchedulePayment()}
              disabled={isProcessing || !scheduledDate}
            >
              {t('owner.paymentQueue.schedulePayment')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
