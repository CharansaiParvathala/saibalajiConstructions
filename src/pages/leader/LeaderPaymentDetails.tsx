import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPaymentRequests, getPaymentRequestHistory } from '@/lib/api/api-client';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { useLanguage } from '@/context/language-context';
import { displayImage, revokeBlobUrl } from '@/lib/utils/image-utils';

const LeaderPaymentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [payment, setPayment] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useLanguage();
  const [imageUrls, setImageUrls] = useState<{ [key: string]: string }>({});
  const [checkerNote, setCheckerNote] = useState<string | null>(null);

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

  useEffect(() => {
    const fetchPayment = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch all payments and find the one with the matching ID
        const userId = localStorage.getItem('userId');
        const payments = await getPaymentRequests(Number(userId));
        const found = payments.find((p: any) => String(p.id) === String(id));
        setPayment(found || null);
        if (!found) setError('Payment not found');
        
        // Fetch payment request history for checker notes
        if (found && found.id) {
          try {
            const history = await getPaymentRequestHistory(Number(found.id));
            const latestNote = history.find((h: any) => h.comment && h.comment.trim());
            setCheckerNote(latestNote ? latestNote.comment : null);
          } catch (e) {
            setCheckerNote(null);
          }
        }
        
        // Load images for this payment and its expenses
        if (found) {
          const newImageUrls: { [key: string]: string } = {};
          
          // Load images for the main payment request
          if (found.image_ids && found.image_ids.length > 0) {
            for (const imageId of found.image_ids) {
              const key = `payment-${found.id}-${imageId}`;
              try {
                const imageUrl = await displayImage(imageId, 'payment-request');
                newImageUrls[key] = imageUrl;
              } catch (error) {
                console.error(`Error loading image ${imageId}:`, error);
              }
            }
          }
          
          // Load images for each expense
          if (found.expenses && found.expenses.length > 0) {
            for (const expense of found.expenses) {
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
          
          setImageUrls(newImageUrls);
        }
      } catch (err) {
        setError('Failed to fetch payment details');
      } finally {
        setLoading(false);
      }
    };
    fetchPayment();
    // Cleanup blob URLs on unmount
    return () => {
      Object.values(imageUrls).forEach(url => revokeBlobUrl(url));
    };
    // eslint-disable-next-line
  }, [id]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!payment) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-4xl font-bold">{t('app.payment.details.title')}</h1>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">{t('app.payment.details.error')}</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      ) : payment ? (
        <div className="space-y-6">
          {/* Main Payment Info Card */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{payment.project_title}</CardTitle>
                  <CardDescription>
                    {t('app.payment.requestedOn')} {formatDate(payment.created_at)}
                  </CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">₹ {Number(payment.total_amount || 0).toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground">Total Amount</div>
                  <div className="mt-2">
                    {getStatusBadge(payment.status)}
                    {checkerNote && (
                      <div className="mt-2 mx-auto max-w-xl p-3 border rounded text-sm whitespace-pre-line break-words text-center bg-background border-border text-foreground dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-100">
                        <strong>Checker Notes:</strong>
                        <div>{checkerNote}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Payment Expenses */}
          {payment.expenses && payment.expenses.length > 0 ? (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">Expense Details</h2>
              {payment.expenses.map((expense: any, index: number) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{expense.expense_type}</CardTitle>
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
                        <div className="bg-muted p-3 rounded-md text-sm text-foreground dark:bg-neutral-800 dark:text-neutral-200">
                          <h4 className="text-sm font-medium mb-2">Remarks</h4>
                          <p>{expense.remarks}</p>
                        </div>
                      )}

                      {/* Images for this specific expense */}
                      {expense.image_ids && expense.image_ids.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Proof Images</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {expense.image_ids.map((imageId: number, imgIndex: number) => {
                              const imageKey = `expense-${expense.id}-${imageId}`;
                              const imageUrl = imageUrls[imageKey];
                              return (
                                <div key={imgIndex} className="w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                                  {imageUrl ? (
                                    <img
                                      src={imageUrl}
                                      alt={`Expense proof ${imgIndex + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                      Loading...
                                    </div>
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
            // Fallback for old format (no expenses array)
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
                    <p className="text-lg font-semibold text-gray-900">₹ {Number(payment.total_amount || 0).toFixed(2)}</p>
                  </div>
                  
                  {/* Description/Remarks */}
                  {payment.description && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">{payment.description}</p>
                    </div>
                  )}

                  {/* Images */}
                  {payment.image_ids && payment.image_ids.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Proof Images</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {payment.image_ids.map((imageId: number, index: number) => {
                          const imageKey = `payment-${payment.id}-${imageId}`;
                          const imageUrl = imageUrls[imageKey];
                          return (
                            <div key={index} className="w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                              {imageUrl ? (
                                <img
                                  src={imageUrl}
                                  alt={`Payment proof ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                  Loading...
                                </div>
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
          )}

          {/* Back Button */}
          <div className="flex justify-start">
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
            >
              {t('app.payment.details.back')}
            </Button>
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t('app.payment.details.notFound')}</CardTitle>
            <CardDescription>
              {t('app.payment.details.notFoundDescription')}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="outline" onClick={() => navigate(-1)}>
              {t('app.payment.details.back')}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
};

export default LeaderPaymentDetails; 