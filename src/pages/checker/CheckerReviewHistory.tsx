import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { getPaymentRequests, getProjects, getUsers } from '@/lib/api/api-client';
import { Project, User } from '@/lib/types';
import { displayImage, revokeBlobUrl } from '@/lib/utils/image-utils';
import { useLanguage } from '@/context/language-context';

const CheckerReviewHistory = () => {
  const { t } = useLanguage();
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [imageUrls, setImageUrls] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null);

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
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">{t('app.checker.reviewHistory.status.pending')}</Badge>;
      case 'approved':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">{t('app.checker.reviewHistory.status.approved')}</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 border-red-300">{t('app.checker.reviewHistory.status.rejected')}</Badge>;
      case 'scheduled':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-300">{t('app.checker.reviewHistory.status.scheduled')}</Badge>;
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 border-green-300">{t('app.checker.reviewHistory.status.paid')}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === Number(projectId));
    return typeof project?.title === 'string' ? project.title : t('app.checker.reviewHistory.unknownProject');
  };

  const getUserName = (userId: string | number, payment?: any) => {
    if (payment && payment.requester_name) return payment.requester_name;
    if (loading) return t('app.common.loading');
    const user = users.find(u => String(u.id) === String(userId));
    return user ? user.name : t('app.checker.reviewHistory.unknownUser');
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-6">{t('app.checker.reviewHistory.title')}</h1>
      <p className="text-muted-foreground mb-8">
        {t('app.checker.reviewHistory.description')}
      </p>
      <div className="mb-6 max-w-xs">
        <Label htmlFor="status-filter">{t('app.checker.reviewHistory.filterByStatus')}</Label>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger id="status-filter">
            <SelectValue placeholder={t('app.checker.reviewHistory.selectStatus')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('app.checker.reviewHistory.status.all')}</SelectItem>
            <SelectItem value="pending">{t('app.checker.reviewHistory.status.pending')}</SelectItem>
            <SelectItem value="approved">{t('app.checker.reviewHistory.status.approved')}</SelectItem>
            <SelectItem value="rejected">{t('app.checker.reviewHistory.status.rejected')}</SelectItem>
            <SelectItem value="scheduled">{t('app.checker.reviewHistory.status.scheduled')}</SelectItem>
            <SelectItem value="paid">{t('app.checker.reviewHistory.status.paid')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {paymentRequests.length === 0 && (
          <Card className="col-span-full">
            <CardHeader>
              <CardTitle>{t('app.checker.reviewHistory.noPaymentRequests')}</CardTitle>
              <CardDescription>{t('app.checker.reviewHistory.noPaymentRequestsDescription')}</CardDescription>
            </CardHeader>
          </Card>
        )}
        {filteredPayments.map(payment => {
          const isExpanded = expandedPaymentId === String(payment.id);
          return (
            <Card key={payment.id}>
              <CardHeader>
                <CardTitle>{getProjectName(payment.projectId || payment.project_id)}</CardTitle>
                <CardDescription>{formatDate(payment.created_at || payment.date)}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between mb-1">
                    <span>{t('app.checker.reviewHistory.statusLabel')}</span>
                    <span>{getStatusBadge(payment.status)}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span>{t('app.checker.reviewHistory.requestedBy')}</span>
                    <span>{getUserName(payment.user_id, payment)}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span>{t('app.checker.reviewHistory.amount')}</span>
                    <span className="font-semibold">₹ {Number(payment.total_amount || payment.totalAmount || 0).toFixed(2)}</span>
                  </div>
                  {payment.checkerNotes && (
                    <div className="bg-muted p-2 rounded text-xs text-muted-foreground mt-2">
                      <strong>{t('app.checker.reviewHistory.checkerNotes')}:</strong> {payment.checkerNotes}
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
                              <img src={imageUrl} alt={t('app.checker.reviewHistory.paymentProofAlt') + ' ' + (index + 1)} className="w-full h-full object-cover" />
                            ) : (
                              <div className="text-gray-400">{t('app.common.loading')}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                {isExpanded && (
                  <div className="mt-6 border-t pt-4 max-h-80 overflow-y-auto rounded-lg shadow-inner bg-gray-50">
                    <div className="mb-4">
                      <h2 className="text-2xl font-bold">
                        {getProjectName(payment.projectId || payment.project_id)}
                      </h2>
                      <div className="text-muted-foreground mb-2">
                        {t('app.checker.reviewHistory.requestedOn') + ' ' + formatDate(payment.created_at || payment.date)}
                      </div>
                    </div>
                    <Card>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle>{getProjectName(payment.projectId || payment.project_id)}</CardTitle>
                            <CardDescription>
                              {t('app.checker.reviewHistory.requestedOn') + ' ' + formatDate(payment.created_at || payment.date)}
                            </CardDescription>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold">₹ {Number(payment.total_amount || payment.totalAmount || 0).toFixed(2)}</div>
                            <div className="text-sm text-muted-foreground">{t('app.checker.reviewHistory.totalAmount')}</div>
                            <div className="mt-2">
                              <Badge>{payment.status}</Badge>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                    {payment.expenses && payment.expenses.length > 0 ? (
                      <div className="space-y-6">
                        <h2 className="text-2xl font-semibold">{t('app.checker.reviewHistory.expenseDetails')}</h2>
                        {payment.expenses.map((expense: any, index: number) => (
                          <Card key={index} className="mb-4">
                            <CardHeader>
                              <div className="flex justify-between items-start">
                                <div>
                                  <CardTitle className="text-lg">{expense.type}</CardTitle>
                                  <CardDescription>{t('app.checker.reviewHistory.expenseNumber') + ' ' + (index + 1)}</CardDescription>
                                </div>
                                <div className="text-right">
                                  <div className="text-xl font-bold">₹ {Number(expense.amount).toFixed(2)}</div>
                                  <div className="text-sm text-muted-foreground">{t('app.checker.reviewHistory.amount')}</div>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                {expense.remarks && (
                                  <div className="bg-muted p-2 rounded text-sm text-muted-foreground">
                                    <strong>{t('app.checker.reviewHistory.remarks')}:</strong> {expense.remarks}
                                  </div>
                                )}
                                {expense.image_ids && expense.image_ids.length > 0 && (
                                  <div>
                                    <h4 className="text-sm font-medium mb-2">{t('app.checker.reviewHistory.proofImages')}</h4>
                                    <div className="flex flex-wrap gap-4">
                                      {expense.image_ids.map((imageId: number, imgIndex: number) => {
                                        const imageKey = `expense-${expense.id}-${imageId}`;
                                        const imageUrl = imageUrls[imageKey];
                                        return (
                                          <div key={imgIndex} className="bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center text-gray-400 p-2">
                                            {imageUrl ? (
                                              <a href={imageUrl} target="_blank" rel="noopener noreferrer">
                                                <img
                                                  src={imageUrl}
                                                  alt={t('app.checker.reviewHistory.expenseProofAlt') + ' ' + (imgIndex + 1)}
                                                  style={{ maxWidth: '100%', maxHeight: 400, display: 'block' }}
                                                />
                                              </a>
                                            ) : (
                                              <div className="text-gray-400">{t('app.common.loading')}</div>
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
                          <CardTitle>{t('app.checker.reviewHistory.paymentDetails')}</CardTitle>
                          <CardDescription>{t('app.checker.reviewHistory.generalPaymentInfo')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-sm font-medium mb-2">{t('app.checker.reviewHistory.amount')}</h4>
                              <span className="text-lg font-semibold">₹ {Number(payment.total_amount || payment.totalAmount || 0).toFixed(2)}</span>
                            </div>
                            {payment.description && (
                              <div>
                                <h4 className="text-sm font-medium mb-2">{t('app.checker.reviewHistory.description')}</h4>
                                <span className="text-sm bg-gray-50 p-3 rounded-md">{payment.description}</span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setExpandedPaymentId(isExpanded ? null : String(payment.id))}
                >
                  {isExpanded ? t('app.checker.reviewHistory.hideDetails') : t('app.checker.reviewHistory.viewDetails')}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default CheckerReviewHistory;