import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/context/language-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';
import { FileText, Download, Plus, Trash2 } from 'lucide-react';
import { exportToPDF } from '@/utils/pdf-export';
import { exportToDocx } from '@/utils/docx-export';

interface ExpenseItem {
  id: string;
  type: string;
  cost: number;
  isCustom: boolean;
}

const AdminCreateTender = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(false);

  const predefinedExpenseTypes = [
    'Labor',
    'Materials',
    'Equipment',
    'Transportation',
    'Permits',
    'Insurance',
    'Other'
  ];

  const addExpense = () => {
    setExpenses([
      ...expenses,
      {
        id: Date.now().toString(),
        type: '',
        cost: 0,
        isCustom: false
      }
    ]);
  };

  const removeExpense = (id: string) => {
    setExpenses(expenses.filter(expense => expense.id !== id));
  };

  const updateExpense = (id: string, field: keyof ExpenseItem, value: any) => {
    setExpenses(expenses.map(expense => {
      if (expense.id === id) {
        if (field === 'type') {
          if (value === 'Other') {
            return {
              ...expense,
              isCustom: true,
              type: expense.type || ''
            };
          }
          return {
            ...expense,
            type: value,
            isCustom: false
          };
        } else if (field === 'customType') {
          return {
            ...expense,
            type: value
          };
        }
        return { ...expense, [field]: value };
      }
      return expense;
    }));
  };

  const calculateTotal = () => {
    return expenses.reduce((sum, expense) => sum + expense.cost, 0);
  };

  const handleExportPDF = async () => {
    try {
      setLoading(true);
      toast.info(t("common.generating"));

      const data = expenses.map(expense => ({
        type: expense.type,
        cost: `₹${expense.cost.toFixed(2)}`
      }));

      await exportToPDF({
        title: 'Tender Document',
        description: 'Detailed breakdown of expenses',
        data,
        columns: [
          { key: 'type', header: 'Expense Type', width: 150 },
          { key: 'cost', header: 'Cost (₹)', width: 100 }
        ],
        fileName: `tender_document_${new Date().toISOString().split('T')[0]}.pdf`,
        watermark: {
          image: '/lovable-uploads/a723c9c5-8174-41c6-b9d7-2d8646801ec6.png',
          opacity: 0.2
        }
      });

      toast.success(t("common.exportSuccess"));
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error(t("common.exportError"));
    } finally {
      setLoading(false);
    }
  };

  const handleExportWord = async () => {
    try {
      setLoading(true);
      toast.info(t("common.generating"));

      const data = expenses.map(expense => ({
        type: expense.type,
        cost: `₹${expense.cost.toFixed(2)}`
      }));

      await exportToDocx({
        title: 'Tender Document',
        description: 'Detailed breakdown of expenses',
        data,
        columns: [
          { key: 'type', header: 'Expense Type' },
          { key: 'cost', header: 'Cost (₹)' }
        ],
        fileName: `tender_document_${new Date().toISOString().split('T')[0]}.docx`,
        watermark: {
          image: '/lovable-uploads/a723c9c5-8174-41c6-b9d7-2d8646801ec6.png',
          opacity: 0.2
        }
      });

      toast.success(t("common.exportSuccess"));
    } catch (error) {
      console.error('Word export error:', error);
      toast.error(t("common.exportError"));
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'admin') {
    return <div>Access denied. Admin only.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-6">Create Tender Document</h1>
      <p className="text-muted-foreground mb-8">
        Add expense types and their costs to generate a tender document
      </p>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Expense Details</CardTitle>
            <CardDescription>
              Add or remove expense types and their associated costs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {expenses.map((expense) => (
                <div key={expense.id} className="flex gap-4 items-end">
                  <div className="flex-1">
                    <Label>Expense Type</Label>
                    <select
                      className="w-full p-2 border rounded bg-white dark:bg-[#23272f] dark:text-white"
                      value={expense.isCustom ? 'Other' : expense.type}
                      onChange={e => updateExpense(expense.id, 'type', e.target.value)}
                    >
                      <option value="" disabled>Select expense type</option>
                      {predefinedExpenseTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                  </div>
                  {expense.isCustom && (
                    <div className="flex-1">
                      <Label>Custom Expense Type</Label>
                      <Input
                        value={expense.type}
                        onChange={(e) => updateExpense(expense.id, 'customType', e.target.value)}
                        placeholder="Enter custom expense type"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <Label>Cost (₹)</Label>
                    <Input
                      type="number"
                      value={expense.cost}
                      onChange={(e) => updateExpense(expense.id, 'cost', parseFloat(e.target.value) || 0)}
                      placeholder="Enter cost"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeExpense(expense.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Button
                variant="outline"
                className="w-full"
                onClick={addExpense}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Expense
              </Button>

              {expenses.length > 0 && (
                <div className="mt-6 p-4 border rounded-lg bg-muted">
                  <div className="text-lg font-semibold">
                    Total Cost: ₹{calculateTotal().toFixed(2)}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {expenses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Export Options</CardTitle>
              <CardDescription>
                Choose the format to export your tender document
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleExportPDF}
                  disabled={loading}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {loading ? 'Generating...' : 'Export as PDF'}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.open('https://www.ilovepdf.com/pdf_to_word', '_blank')}
                  disabled={loading}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Convert to Word
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminCreateTender; 