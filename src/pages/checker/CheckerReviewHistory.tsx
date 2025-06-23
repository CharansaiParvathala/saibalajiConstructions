import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { getPaymentRequests, getProjects, getUsers } from '@/lib/api/api-client';
import { Project, User } from '@/lib/types';
import { displayImage, revokeBlobUrl } from '@/lib/utils/image-utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const CheckerReviewHistory = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [imageUrls, setImageUrls] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const detailsButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const allProjects = await getProjects();
        setProjects(allProjects);
        let allUsers: User[] = [];
        try {
          allUsers = await getUsers();
        } catch {}
        setUsers(allUsers);
        const allPayments = await getPaymentRequests(0);
        setPaymentRequests(allPayments);
        await loadImagesForPayments(allPayments);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

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
      if (payment.expenses && payment.expenses.length > 0) {
        for (const expense of payment.expenses) {
          if (expense.image_ids && expense.image_ids.length > 0) {
            for (const imageId of expense.image_ids) {
              const key = `expense-${expense.id}-${imageId}`;
              try {
                const imageUrl = await displayImage(imageId, 'payment-request');
                newImageUrls[key] = imageUrl;
              } catch (error) {
                console.error(`Error loading expense image ${imageId}:`, error);
              }
            }
          }
        }
      }
    }
    setImageUrls(newImageUrls);
  };

  useEffect(() => {
    return () => {
      Object.values(imageUrls).forEach(url => {
        revokeBlobUrl(url);
      });
    };
  }, [imageUrls]);

  const filteredPayments = statusFilter === 'all'
    ? paymentRequests
    : paymentRequests.filter(payment => payment.status === statusFilter);

  const groupedPayments = filteredPayments.reduce((groups: Record<string, any[]>, payment: any) => {
    const date = new Date(payment.created_at || payment.date).toISOString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(payment);
    return groups;
  }, {} as Record<string, any[]>);

  const sortedDates = Object.keys(groupedPayments).sort((a, b) =>
    new Date(b).getTime() - new Date(a).getTime()
  );

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === Number(projectId));
    return project ? project.title : 'Unknown Project';
  };

  const getUserName = (userId: string | number, payment?: any) => {
    if (payment && payment.requester_name) return payment.requester_name;
    if (loading) return 'Loading...';
    const user = users.find(u => String(u.id) === String(userId));
    return user ? user.name : 'Unknown User';
  };

  useEffect(() => {
    if (showDetailsDialog) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showDetailsDialog]);

  const handleViewDetails = (payment: any, event?: React.MouseEvent<HTMLButtonElement>) => {
    setSelectedPayment(payment);
    setShowDetailsDialog(true);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-6">Payment Review History</h1>
      <p className="text-muted-foreground mb-8">
        View all payment requests, their status, and details. Use the status filter to narrow results.
      </p>
      <div className="mb-6 max-w-xs">
        <Label htmlFor="status-filter">Filter by Status</Label>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger id="status-filter">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {paymentRequests.length === 0 && (
          <Card className="col-span-full">
            <CardHeader>
              <CardTitle>No Payment Requests</CardTitle>
              <CardDescription>No payment requests match the selected filter.</CardDescription>
            </CardHeader>
          </Card>
        )}
        {filteredPayments.map(payment => (
          <Card key={payment.id}>
            <CardHeader>
              <CardTitle>{getProjectName(payment.projectId || payment.project_id)}</CardTitle>
              <CardDescription>{formatDate(payment.created_at || payment.date)}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between mb-1">
                  <span>Status:</span>
                  <span>{getStatusBadge(payment.status)}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>Requested by:</span>
                  <span>{getUserName(payment.user_id, payment)}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>Amount:</span>
                  <span className="font-semibold">₹ {Number(payment.total_amount || payment.totalAmount || 0).toFixed(2)}</span>
                </div>
                {payment.checkerNotes && (
                  <div className="bg-muted p-2 rounded text-xs text-muted-foreground mt-2">
                    <strong>Checker Notes:</strong> {payment.checkerNotes}
                  </div>
                )}
                {payment.image_ids && payment.image_ids.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {payment.image_ids.map((imageId: number, index: number) => {
                      const imageKey = `${payment.id}-${imageId}`;
                      const imageUrl = imageUrls[imageKey];
                      return (
                        <div key={index} className="w-full h-24 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                          {imageUrl ? (
                            <img src={imageUrl} alt={`Payment proof ${index + 1}`} className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-gray-400">Loading...</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" onClick={e => handleViewDetails(payment, e)}>
                View Details
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl w-full max-h-[90vh]" position="center">
          <div className="overflow-y-auto max-h-[75vh]">
            <DialogHeader>
              <DialogTitle>Payment Details</DialogTitle>
              <DialogDescription>
                {selectedPayment && (
                  <div className="mb-2 space-y-1">
                    <div><span className="font-medium">Project:</span> {getProjectName(selectedPayment.projectId || selectedPayment.project_id)}</div>
                    <div><span className="font-medium">Requested by:</span> {getUserName(selectedPayment.user_id, selectedPayment)}</div>
                    <div><span className="font-medium">Requested on:</span> {formatDate(selectedPayment.created_at || selectedPayment.date)}</div>
                    <div><span className="font-medium">Status:</span> {getStatusBadge(selectedPayment.status)}</div>
                    <div><span className="font-medium">Total Amount:</span> ₹ {Number(selectedPayment.total_amount || selectedPayment.totalAmount || 0).toFixed(2)}</div>
                  </div>
                )}
              </DialogDescription>
            </DialogHeader>
            {selectedPayment && (
              <div className="space-y-6">
                {selectedPayment.checkerNotes && (
                  <div className="bg-muted p-3 rounded text-sm text-muted-foreground">
                    <strong>Checker Notes:</strong> {selectedPayment.checkerNotes}
                  </div>
                )}
                {selectedPayment.expenses && selectedPayment.expenses.length > 0 && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold">Expense Details</h2>
                    {selectedPayment.expenses.map((expense: any, index: number) => (
                      <Card key={index} className="mb-4">
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
                            {expense.remarks && (
                              <div className="bg-muted p-2 rounded text-sm text-muted-foreground">
                                <strong>Remarks:</strong> {expense.remarks}
                              </div>
                            )}
                            {expense.image_ids && expense.image_ids.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium mb-2">Proof Images</h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                  {expense.image_ids.map((imageId: number, imgIndex: number) => {
                                    const imageKey = `expense-${expense.id}-${imageId}`;
                                    const imageUrl = imageUrls[imageKey];
                                    return (
                                      <div key={imgIndex} className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                                        {imageUrl ? (
                                          <img src={imageUrl} alt={`Expense proof ${imgIndex + 1}`} className="w-full h-full object-cover" />
                                        ) : (
                                          <div className="text-gray-400">Loading...</div>
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
                )}
                {!selectedPayment.expenses && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Payment Details</CardTitle>
                      <CardDescription>General payment information</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-medium mb-2">Amount</h4>
                          <span className="text-lg font-semibold">₹ {Number(selectedPayment.total_amount || 0).toFixed(2)}</span>
                        </div>
                        {selectedPayment.description && (
                          <div>
                            <h4 className="text-sm font-medium mb-2">Description</h4>
                            <span className="text-sm bg-gray-50 p-3 rounded-md">{selectedPayment.description}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CheckerReviewHistory;