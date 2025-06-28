import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/context/language-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/sonner';
import { Plus, Download, Trash2, Edit, FileText } from 'lucide-react';
import { getAllProjects } from '@/lib/storage';
import { getTenderBills, saveTenderBill, deleteTenderBill, getTenders, saveTender, updateTender } from '@/lib/tender-storage';
import { TenderBill, Tender, TenderItem } from '@/lib/tender-types';
import { Project } from '@/lib/types';
import { exportToPDF } from '@/utils/pdf-export';
import { exportToDocx } from '@/utils/docx-export';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const AdminTenders = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [tenderBills, setTenderBills] = useState<TenderBill[]>([]);
  const [tenders, setTenders] = useState<Tender[]>([]);
  
  // Bill form state
  const [billForm, setBillForm] = useState({
    billType: '',
    customBillType: '',
    description: '',
    cost: ''
  });
  
  // Tender form state
  const [tenderForm, setTenderForm] = useState({
    projectId: '',
    title: '',
    description: '',
    selectedBills: [] as { billId: string; quantity: number; unitCost: number }[]
  });
  
  const [showBillDialog, setShowBillDialog] = useState(false);
  const [showTenderDialog, setShowTenderDialog] = useState(false);
  const [editingTender, setEditingTender] = useState<Tender | null>(null);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    
    setProjects(getAllProjects());
    setTenderBills(getTenderBills());
    setTenders(getTenders());
  }, [user]);

  const handleSaveBill = () => {
    if (!billForm.billType || !billForm.cost) {
      toast.error('Please fill all required fields');
      return;
    }

    const billType = billForm.billType === 'other' ? billForm.customBillType : billForm.billType;
    if (!billType) {
      toast.error('Please specify bill type');
      return;
    }

    saveTenderBill({
      billType,
      description: billForm.description,
      cost: parseFloat(billForm.cost),
      createdBy: user?.id || ''
    });

    setTenderBills(getTenderBills());
    setBillForm({ billType: '', customBillType: '', description: '', cost: '' });
    setShowBillDialog(false);
    toast.success('Bill saved successfully');
  };

  const handleDeleteBill = (billId: string) => {
    deleteTenderBill(billId);
    setTenderBills(getTenderBills());
    toast.success('Bill deleted successfully');
  };

  const handleSaveTender = () => {
    if (!tenderForm.projectId || !tenderForm.title || tenderForm.selectedBills.length === 0) {
      toast.error('Please fill all required fields and select at least one bill');
      return;
    }

    const items: TenderItem[] = tenderForm.selectedBills.map(selectedBill => {
      const bill = tenderBills.find(b => b.id === selectedBill.billId);
      return {
        id: crypto.randomUUID(),
        tenderId: '',
        billId: selectedBill.billId,
        quantity: selectedBill.quantity,
        unitCost: selectedBill.unitCost,
        totalCost: selectedBill.quantity * selectedBill.unitCost,
        billType: bill?.billType || '',
        description: bill?.description
      };
    });

    const totalCost = items.reduce((sum, item) => sum + item.totalCost, 0);

    if (editingTender) {
      const updatedTender = updateTender(editingTender.id, {
        projectId: tenderForm.projectId,
        title: tenderForm.title,
        description: tenderForm.description,
        items,
        totalCost
      });
      if (updatedTender) {
        setEditingTender(null);
        toast.success('Tender updated successfully');
      }
    } else {
      saveTender({
        projectId: tenderForm.projectId,
        title: tenderForm.title,
        description: tenderForm.description,
        items,
        totalCost,
        createdBy: user?.id || ''
      });
      toast.success('Tender created successfully');
    }

    setTenders(getTenders());
    setTenderForm({ projectId: '', title: '', description: '', selectedBills: [] });
    setShowTenderDialog(false);
  };

  const handleAddBillToTender = () => {
    setTenderForm(prev => ({
      ...prev,
      selectedBills: [...prev.selectedBills, { billId: '', quantity: 1, unitCost: 0 }]
    }));
  };

  const handleUpdateSelectedBill = (index: number, field: string, value: any) => {
    setTenderForm(prev => ({
      ...prev,
      selectedBills: prev.selectedBills.map((bill, i) => 
        i === index ? { ...bill, [field]: value } : bill
      )
    }));
  };

  const handleRemoveSelectedBill = (index: number) => {
    setTenderForm(prev => ({
      ...prev,
      selectedBills: prev.selectedBills.filter((_, i) => i !== index)
    }));
  };

  const handleExportTenderPDF = async (tender: Tender) => {
    try {
      const project = projects.find(p => p.id === tender.projectId);
      const doc = await exportToPDF({
        title: `Tender - ${tender.title}`,
        description: `Project: ${project?.name || 'Unknown'}`,
        data: tender.items.map(item => ({
          billType: item.billType,
          description: item.description || '',
          quantity: item.quantity.toString(),
          unitCost: `₹${item.unitCost.toFixed(2)}`,
          totalCost: `₹${item.totalCost.toFixed(2)}`
        })),
        columns: [
          { key: 'billType', header: 'Bill Type', width: 80 },
          { key: 'description', header: 'Description', width: 120 },
          { key: 'quantity', header: 'Quantity', width: 60 },
          { key: 'unitCost', header: 'Unit Cost', width: 80 },
          { key: 'totalCost', header: 'Total Cost', width: 80 }
        ],
        fileName: `tender_${tender.id}_${new Date().toISOString().split('T')[0]}.pdf`,
        watermark: 'SAIBALAJI CONSTRUCTION TENDER'
      });
      
      toast.success('Tender PDF exported successfully');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    }
  };

  const handleExportTenderWord = async (tender: Tender) => {
    try {
      const project = projects.find(p => p.id === tender.projectId);
      await exportToDocx({
        title: `Tender - ${tender.title}`,
        description: `Project: ${project?.name || 'Unknown'}`,
        data: tender.items.map(item => ({
          billType: item.billType,
          description: item.description || '',
          quantity: item.quantity.toString(),
          unitCost: `₹${item.unitCost.toFixed(2)}`,
          totalCost: `₹${item.totalCost.toFixed(2)}`
        })),
        columns: [
          { key: 'billType', header: 'Bill Type' },
          { key: 'description', header: 'Description' },
          { key: 'quantity', header: 'Quantity' },
          { key: 'unitCost', header: 'Unit Cost' },
          { key: 'totalCost', header: 'Total Cost' }
        ],
        fileName: `tender_${tender.id}_${new Date().toISOString().split('T')[0]}.docx`
      });
      
      toast.success('Tender Word document exported successfully');
    } catch (error) {
      console.error('Word export error:', error);
      toast.error('Failed to export Word document');
    }
  };

  if (user?.role !== 'admin') {
    return <div>Access denied. Admin only.</div>;
  }

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Tender Management</h1>
        <p className="text-muted-foreground">Create and manage tender bills and tenders</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Bills Management */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Tender Bills</CardTitle>
                <CardDescription>Manage bill types and costs</CardDescription>
              </div>
              <Dialog open={showBillDialog} onOpenChange={setShowBillDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Bill
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Bill</DialogTitle>
                    <DialogDescription>Create a new tender bill type</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Bill Type</Label>
                      <select
                        className="w-full p-2 border rounded bg-white dark:bg-[#23272f] dark:text-white"
                        value={billForm.billType}
                        onChange={e => setBillForm(prev => ({ ...prev, billType: e.target.value }))}
                      >
                        <option value="" disabled>Select bill type</option>
                        <option value="material">Material</option>
                        <option value="labor">Labor</option>
                        <option value="equipment">Equipment</option>
                        <option value="transport">Transport</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    
                    {billForm.billType === 'other' && (
                      <div>
                        <Label>Custom Bill Type</Label>
                        <Input
                          value={billForm.customBillType}
                          onChange={(e) => setBillForm(prev => ({ ...prev, customBillType: e.target.value }))}
                          placeholder="Enter custom bill type"
                        />
                      </div>
                    )}
                    
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={billForm.description}
                        onChange={(e) => setBillForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Bill description"
                      />
                    </div>
                    
                    <div>
                      <Label>Cost (₹)</Label>
                      <Input
                        type="number"
                        value={billForm.cost}
                        onChange={(e) => setBillForm(prev => ({ ...prev, cost: e.target.value }))}
                        placeholder="Enter cost"
                      />
                    </div>
                    
                    <Button onClick={handleSaveBill} className="w-full">Save Bill</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {tenderBills.map(bill => (
                <div key={bill.id} className="flex justify-between items-center p-2 border rounded">
                  <div>
                    <p className="font-medium">{bill.billType}</p>
                    <p className="text-sm text-muted-foreground">₹{bill.cost.toFixed(2)}</p>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteBill(bill.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tender Creation */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Tenders</CardTitle>
                <CardDescription>Create and manage project tenders</CardDescription>
              </div>
              <Dialog open={showTenderDialog} onOpenChange={setShowTenderDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Tender
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingTender ? 'Edit' : 'Create'} Tender</DialogTitle>
                    <DialogDescription>Configure tender details and bills</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Project</Label>
                      <select
                        className="w-full p-2 border rounded bg-white dark:bg-[#23272f] dark:text-white"
                        value={tenderForm.projectId}
                        onChange={e => setTenderForm(prev => ({ ...prev, projectId: e.target.value }))}
                      >
                        <option value="" disabled>Select project</option>
                          {projects.map(project => (
                          <option key={project.id} value={project.id}>{project.name}</option>
                          ))}
                      </select>
                    </div>
                    
                    <div>
                      <Label>Tender Title</Label>
                      <Input
                        value={tenderForm.title}
                        onChange={(e) => setTenderForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Enter tender title"
                      />
                    </div>
                    
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={tenderForm.description}
                        onChange={(e) => setTenderForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Tender description"
                      />
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <Label>Selected Bills</Label>
                        <Button variant="outline" size="sm" onClick={handleAddBillToTender}>
                          <Plus className="h-4 w-4 mr-1" />
                          Add Bill
                        </Button>
                      </div>
                      
                      {tenderForm.selectedBills.map((selectedBill, index) => (
                        <div key={index} className="grid grid-cols-4 gap-2 p-2 border rounded">
                          <select
                            className="w-full p-2 border rounded bg-white dark:bg-[#23272f] dark:text-white"
                            value={selectedBill.billId} 
                            onChange={e => {
                              const bill = tenderBills.find(b => b.id === e.target.value);
                              handleUpdateSelectedBill(index, 'billId', e.target.value);
                              handleUpdateSelectedBill(index, 'unitCost', bill?.cost || 0);
                            }}
                          >
                            <option value="" disabled>Select bill</option>
                              {tenderBills.map(bill => (
                              <option key={bill.id} value={bill.id}>
                                  {bill.billType} - ₹{bill.cost}
                              </option>
                              ))}
                          </select>
                          
                          <Input
                            type="number"
                            value={selectedBill.quantity}
                            onChange={(e) => handleUpdateSelectedBill(index, 'quantity', parseInt(e.target.value) || 0)}
                            placeholder="Qty"
                          />
                          
                          <Input
                            type="number"
                            value={selectedBill.unitCost}
                            onChange={(e) => handleUpdateSelectedBill(index, 'unitCost', parseFloat(e.target.value) || 0)}
                            placeholder="Unit Cost"
                          />
                          
                          <div className="flex items-center justify-between">
                            <span className="text-sm">₹{(selectedBill.quantity * selectedBill.unitCost).toFixed(2)}</span>
                            <Button variant="destructive" size="sm" onClick={() => handleRemoveSelectedBill(index)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <Button onClick={handleSaveTender} className="w-full">
                      {editingTender ? 'Update' : 'Create'} Tender
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {tenders.map(tender => {
                const project = projects.find(p => p.id === tender.projectId);
                return (
                  <div key={tender.id} className="p-3 border rounded">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">{tender.title}</p>
                        <p className="text-sm text-muted-foreground">{project?.name}</p>
                        <p className="text-sm font-medium">Total: ₹{tender.totalCost.toFixed(2)}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingTender(tender);
                            setTenderForm({
                              projectId: tender.projectId,
                              title: tender.title,
                              description: tender.description || '',
                              selectedBills: tender.items.map(item => ({
                                billId: item.billId,
                                quantity: item.quantity,
                                unitCost: item.unitCost
                              }))
                            });
                            setShowTenderDialog(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleExportTenderPDF(tender)}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => window.open('https://www.ilovepdf.com/pdf_to_word', '_blank')}>
                          <FileText className="h-4 w-4" />
                          Convert to Word
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminTenders;
