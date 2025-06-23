import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
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

import { getPaymentRequests, getProjects, updatePaymentRequestStatus } from '@/lib/api/api-client';
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
  const [allProjects, setAllProjects] = useState<Project[]>([]);

  // Load payment requests
  useEffect(() => {
    const fetchData = async () => {
      const userId = user && user.id ? Number(user.id) : 0;
      const requests = await getPaymentRequests(userId);
      setPaymentRequests(requests);
      setFilteredRequests(requests);
      const projects = await getProjects();
      setAllProjects(projects);
    };
    fetchData();
  }, [user]);

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
        const project = allProjects.find((p) => p.id === Number(req.projectId));
        return (
          project?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          req.id.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    setFilteredRequests(filtered);
  }, [paymentRequests, filter, searchTerm, allProjects]);

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
      
      updatePaymentRequestStatus(selectedRequest.id, 'paid');
      
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
      
      updatePaymentRequestStatus(selectedRequest.id, 'scheduled');
      
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
  const getProjectName = (projectId: number): string => {
    const project = allProjects.find((p) => p.id === projectId);
    return project?.title || t('owner.projects.unknown');
  };

  const handleStatusChange = async (requestId: string, newStatus: 'approved' | 'rejected' | 'paid') => {
    try {
      const updatedRequest = await updatePaymentRequestStatus(requestId, newStatus);
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

  // Helper to get display status for owner
  const getOwnerStatus = (status: string) => {
    if (status === 'scheduled' || status === 'paid') return 'Confirmed';
    return 'Pending';
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
            const project = getProjectName(Number(request.projectId));
            const totalAmount = request.totalAmount;
            const ownerStatus = getOwnerStatus(request.status);
            return (
              <Card key={request.id} className="overflow-hidden">
                <CardHeader className="bg-muted/50">
                  <CardTitle className="flex justify-between items-start">
                    <span>{project}</span>
                    <Badge variant={ownerStatus === 'Confirmed' ? 'default' : 'secondary'}>
                      {ownerStatus}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {t('owner.paymentQueue.date')}: 
                    {request.date && !isNaN(new Date(request.date).getTime())
                      ? format(new Date(request.date), 'PPP')
                      : t('owner.paymentQueue.invalidDate')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium">{t('owner.paymentQueue.paymentDetails')}</h3>
                      <div className="mt-1 grid grid-cols-2 gap-1 text-sm">
                        <span className="text-muted-foreground">{t('owner.paymentQueue.amount')}:</span>
                        <span className="font-medium text-right">₹{typeof totalAmount === 'number' && !isNaN(totalAmount) ? totalAmount.toFixed(2) : '0.00'}</span>
                        <span className="text-muted-foreground">{t('owner.paymentQueue.purposes')}:</span>
                        <span className="text-right">
                          {Array.isArray(request.expenses) ? request.expenses.map(e => e.type).join(', ') : '-'}
                        </span>
                        <span className="text-muted-foreground">{t('owner.paymentQueue.status')}:</span>
                        <span className="text-right capitalize">{ownerStatus}</span>
                        {request.scheduledDate && (
                          <>
                            <span className="text-muted-foreground">{t('owner.paymentQueue.scheduledFor')}:</span>
                            <span className="text-right">
                              {request.scheduledDate && !isNaN(new Date(request.scheduledDate).getTime())
                                ? format(new Date(request.scheduledDate), 'PPP')
                                : t('owner.paymentQueue.invalidDate')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => selectRequest(request)}
                    className="w-full"
                  >
                    {t('owner.paymentQueue.viewDetails')}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
          {filteredRequests.length === 0 && (
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>No Payment Requests</CardTitle>
                <CardDescription>
                  No payment requests are currently available.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      )}
      
      {/* Payment Process Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('owner.paymentQueue.paymentDetails')}</DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <>
                  <p>{getProjectName(Number(selectedRequest.projectId))}</p>
                  <p>{t('owner.paymentQueue.date')}: {selectedRequest.date && !isNaN(new Date(selectedRequest.date).getTime()) ? format(new Date(selectedRequest.date), 'PPP') : t('owner.paymentQueue.invalidDate')}</p>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{getProjectName(Number(selectedRequest.projectId))}</CardTitle>
                      <CardDescription>
                        {t('owner.paymentQueue.date')}: {selectedRequest.date && !isNaN(new Date(selectedRequest.date).getTime()) ? format(new Date(selectedRequest.date), 'PPP') : t('owner.paymentQueue.invalidDate')}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">₹{typeof selectedRequest.totalAmount === 'number' && !isNaN(selectedRequest.totalAmount) ? selectedRequest.totalAmount.toFixed(2) : '0.00'}</div>
                      <div className="text-sm text-muted-foreground">Total Amount</div>
                      <div className="mt-2">
                        <Badge>{getOwnerStatus(selectedRequest.status)}</Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>
              {/* Expense Details */}
              {Array.isArray(selectedRequest.expenses) && selectedRequest.expenses.length > 0 ? (
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
                            <div className="text-xl font-bold">₹ {typeof expense.amount === 'number' && !isNaN(expense.amount) ? expense.amount.toFixed(2) : '0.00'}</div>
                            <div className="text-sm text-muted-foreground">Amount</div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {expense.remarks && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-2">Remarks</h4>
                              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">{expense.remarks}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground">No expense details available.</div>
              )}
              {/* Payment Actions */}
              {getOwnerStatus(selectedRequest.status) === 'Pending' && (
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
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
