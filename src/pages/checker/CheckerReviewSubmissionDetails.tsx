import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/context/language-context';
import { toast } from '@/components/ui/use-toast';
import { apiRequest, getPaymentRequestImage, updatePaymentRequestStatus } from '@/lib/api/api-client';

const CheckerReviewSubmissionDetails = () => {
  const { id } = useParams();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [expenseImageUrls, setExpenseImageUrls] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const fetchRequest = async () => {
      setLoading(true);
      try {
        const res = await apiRequest(`/payment-requests/${id}`);
        setRequest(res);
        setNotes(res.checkerNotes || '');
        // Fetch images for each expense
        const newImageUrls: { [key: string]: string } = {};
        if (res.expenses) {
          for (const expense of res.expenses) {
            if (expense.image_ids && expense.image_ids.length > 0) {
              for (const imageId of expense.image_ids) {
                const key = `expense-${expense.id}-${imageId}`;
                try {
                  const blob = await getPaymentRequestImage(imageId);
                  const url = URL.createObjectURL(blob);
                  newImageUrls[key] = url;
                } catch {
                  newImageUrls[key] = '';
                }
              }
            }
          }
        }
        setExpenseImageUrls(newImageUrls);
      } catch (err) {
        toast({ title: 'Error', description: 'Failed to load request details' });
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchRequest();
    // Clean up blob URLs on unmount
    return () => {
      Object.values(expenseImageUrls).forEach(url => URL.revokeObjectURL(url));
      setExpenseImageUrls({});
    };
  }, [id]);

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      await updatePaymentRequestStatus(id, 'approved', notes);
      toast({ title: t('app.checker.reviewSubmissions.approveSuccess') });
      navigate(-1);
    } catch (err) {
      toast({ title: 'Error', description: t('app.checker.reviewSubmissions.approveError') });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!notes.trim()) {
      toast({ title: 'Error', description: t('app.checker.reviewSubmissions.rejectionNotesRequired') });
      return;
    }
    setSubmitting(true);
    try {
      await updatePaymentRequestStatus(id, 'rejected', notes);
      toast({ title: t('app.checker.reviewSubmissions.rejectSuccess') });
      navigate(-1);
    } catch (err) {
      toast({ title: 'Error', description: t('app.checker.reviewSubmissions.rejectError') });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!request) return <div className="p-8 text-center">Request not found.</div>;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>{request.projectTitle || `Project (${request.projectId || request.project_id})`}</CardTitle>
          <CardDescription>
            {t('app.checker.reviewSubmissions.reviewDialogDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <p className="font-medium">Description</p>
            <p className="text-muted-foreground mb-2">{request.description}</p>
            <p className="font-medium">Expenses</p>
            <div className="space-y-4 mt-2">
              {request.expenses && request.expenses.map((expense, index) => (
                <div key={index} className="border rounded p-3 bg-gray-50">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                      <div className="font-semibold">{expense.expense_type || expense.type}</div>
                      <div>Amount: ₹ {expense.amount}</div>
                      {expense.remarks && <div>Remarks: {expense.remarks}</div>}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
                      {expense.image_ids && expense.image_ids.length > 0 ? (
                        expense.image_ids.map((imageId, imgIndex) => {
                          const key = `expense-${expense.id}-${imageId}`;
                          const imageUrl = expenseImageUrls[key];
                          return (
                            <div key={imgIndex} className="bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center text-gray-400 p-2">
                              {imageUrl ? (
                                <a href={imageUrl} target="_blank" rel="noopener noreferrer">
                                  <img
                                    src={imageUrl}
                                    alt={`Expense proof ${imgIndex + 1}`}
                                    style={{ maxWidth: '120px', maxHeight: '120px', display: 'block' }}
                                  />
                                </a>
                              ) : (
                                <span>Loading...</span>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <span className="text-xs text-muted-foreground">No images</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mb-4">
            <Label htmlFor="notes">{t('app.checker.reviewSubmissions.checkerNotes')}</Label>
            <Textarea
              id="notes"
              placeholder={t('app.checker.reviewSubmissions.notesPlaceholder')}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={4}
              className="mt-2"
            />
            <div className="flex gap-2 mt-2">
              <Button variant="outline" onClick={handleReject} disabled={submitting}>{t('app.checker.reviewSubmissions.reject')}</Button>
              <Button onClick={handleApprove} disabled={submitting}>{t('app.checker.reviewSubmissions.approve')}</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CheckerReviewSubmissionDetails; 