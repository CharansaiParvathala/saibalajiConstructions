import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/sonner';
import { getVehicles, createVehicle } from '@/lib/api/api-client';
import { Vehicle } from '@/lib/types';
import { useLanguage } from '@/context/language-context';

const AdminVehicles = () => {
  const { t } = useLanguage();

  const VEHICLE_TYPES = [
    { value: 'truck', label: t('app.admin.vehicles.type.truck') },
    { value: 'tractor', label: t('app.admin.vehicles.type.tractor') },
    { value: 'jcb', label: t('app.admin.vehicles.type.jcb') },
    { value: 'other', label: t('app.admin.vehicles.type.other') },
  ];

  const [vehicles, setVehicles] = useState<any[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  
  const [type, setType] = useState('truck');
  const [model, setModel] = useState('');
  const [rcImage, setRcImage] = useState<File | null>(null);
  const [rcExpiry, setRcExpiry] = useState('');
  const [pollutionCertImage, setPollutionCertImage] = useState<File | null>(null);
  const [pollutionCertExpiry, setPollutionCertExpiry] = useState('');
  const [fitnessCertImage, setFitnessCertImage] = useState<File | null>(null);
  const [fitnessCertExpiry, setFitnessCertExpiry] = useState('');
  
  // Load vehicles on mount
  useEffect(() => {
    loadVehicles();
  }, []);
  
  const loadVehicles = async () => {
    try {
      const data = await getVehicles();
      setVehicles(data);
    } catch (error) {
      toast.error(t('app.admin.vehicles.fetchError'));
    }
  };
  
  const handleAddVehicle = async () => {
    if (!type || !model) {
      toast.error(t('app.admin.vehicles.requiredFields'));
      return;
    }
    try {
      await createVehicle({
        type,
        model,
        rc_image: rcImage || undefined,
        rc_expiry: rcExpiry,
        pollution_cert_image: pollutionCertImage || undefined,
        pollution_cert_expiry: pollutionCertExpiry,
        fitness_cert_image: fitnessCertImage || undefined,
        fitness_cert_expiry: fitnessCertExpiry,
      });
      toast.success(t('app.admin.vehicles.addSuccess'));
        setShowAddDialog(false);
        resetForm();
        loadVehicles();
    } catch (error: any) {
      toast.error(error?.message || t('app.admin.vehicles.addError'));
    }
  };
  
  const handleEditVehicle = () => {
    if (!selectedVehicle || !model || !pollutionCertExpiry || !fitnessCertExpiry) {
      toast.error(t('app.admin.vehicles.requiredFields'));
      return;
    }
    
    try {
      updateVehicle({
        ...selectedVehicle,
        model,
        pollutionCertExpiry,
        fitnessCertExpiry,
      });
      
      toast.success(t('app.admin.vehicles.updateSuccess'));
      setShowEditDialog(false);
      resetForm();
      loadVehicles();
    } catch (error) {
      console.error("Error updating vehicle:", error);
      toast.error(t('app.admin.vehicles.updateError'));
    }
  };
  
  const handleDeleteVehicle = async (id: number) => {
    if (!window.confirm(t('app.admin.vehicles.deleteConfirm'))) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/auth/vehicles/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error(t('app.admin.vehicles.deleteError'));
      toast.success(t('app.admin.vehicles.deleteSuccess'));
      loadVehicles();
    } catch (error) {
      toast.error(t('app.admin.vehicles.deleteError'));
    }
  };
  
  const openEditDialog = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setModel(vehicle.model);
    setPollutionCertExpiry(vehicle.pollutionCertExpiry);
    setFitnessCertExpiry(vehicle.fitnessCertExpiry);
    setShowEditDialog(true);
  };
  
  const openDeleteDialog = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setShowDeleteDialog(true);
  };
  
  const resetForm = () => {
    setType('truck');
    setModel('');
    setRcImage(null);
    setRcExpiry('');
    setPollutionCertImage(null);
    setPollutionCertExpiry('');
    setFitnessCertImage(null);
    setFitnessCertExpiry('');
    setSelectedVehicle(null);
  };

  const downloadBlob = (blob: any, filename: string) => {
    const url = URL.createObjectURL(new Blob([blob]));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-6">{t('app.admin.vehicles.manageVehicles')}</h1>
      <p className="text-muted-foreground mb-8">
        {t('app.admin.vehicles.manageVehiclesDescription')}
      </p>
      
      <Card>
        <CardHeader>
          <CardTitle>{t('app.admin.vehicles.vehicles')}</CardTitle>
          <CardDescription>
            {t('app.admin.vehicles.manageVehicleDetails')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <Button onClick={() => setShowAddDialog(true)}>{t('app.admin.vehicles.addVehicle')}</Button>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('app.admin.vehicles.type')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('app.admin.vehicles.model')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('app.admin.vehicles.rcExpiry')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('app.admin.vehicles.pollutionCertExpiry')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('app.admin.vehicles.fitnessCertExpiry')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('app.admin.vehicles.rcImage')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('app.admin.vehicles.pollutionCertImage')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('app.admin.vehicles.fitnessCertImage')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('app.admin.vehicles.actions')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {vehicles.map(vehicle => (
                    <tr key={vehicle.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{vehicle.type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{vehicle.model}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vehicle.rc_expiry ? new Date(vehicle.rc_expiry).toLocaleDateString() : ''}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vehicle.pollution_cert_expiry ? new Date(vehicle.pollution_cert_expiry).toLocaleDateString() : ''}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vehicle.fitness_cert_expiry ? new Date(vehicle.fitness_cert_expiry).toLocaleDateString() : ''}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {vehicle.rc_image && (
                          <a
                            href={`http://localhost:3001/api/auth/vehicles/${vehicle.id}/rc_image`}
                            download={vehicle.rc_image_name || `rc_${vehicle.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline text-blue-600 hover:text-blue-800"
                          >
                            Download
                          </a>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {vehicle.pollution_cert_image && (
                          <a
                            href={`http://localhost:3001/api/auth/vehicles/${vehicle.id}/pollution_cert_image`}
                            download={vehicle.pollution_cert_image_name || `pollution_cert_${vehicle.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline text-blue-600 hover:text-blue-800"
                          >
                            Download
                          </a>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {vehicle.fitness_cert_image && (
                          <a
                            href={`http://localhost:3001/api/auth/vehicles/${vehicle.id}/fitness_cert_image`}
                            download={vehicle.fitness_cert_image_name || `fitness_cert_${vehicle.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline text-blue-600 hover:text-blue-800"
                          >
                            Download
                          </a>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteVehicle(vehicle.id)}
                        >
                          {t('app.admin.vehicles.delete')}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Add Vehicle Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('app.admin.vehicles.addVehicle')}</DialogTitle>
            <DialogDescription>
              {t('app.admin.vehicles.addVehicleDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">{t('app.admin.vehicles.type')}</Label>
              <select id="type" value={type} onChange={e => setType(e.target.value)} className="col-span-3 border rounded px-2 py-1">
                {VEHICLE_TYPES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="model" className="text-right">{t('app.admin.vehicles.model')}</Label>
              <Input id="model" value={model} onChange={e => setModel(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rc_image" className="text-right">{t('app.admin.vehicles.rcImage')}</Label>
              <Input id="rc_image" type="file" accept="image/*" onChange={e => setRcImage(e.target.files?.[0] || null)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rc_expiry" className="text-right">{t('app.admin.vehicles.rcExpiry')}</Label>
              <Input id="rc_expiry" type="date" value={rcExpiry} onChange={e => setRcExpiry(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="pollution_cert_image" className="text-right">{t('app.admin.vehicles.pollutionCertImage')}</Label>
              <Input id="pollution_cert_image" type="file" accept="image/*" onChange={e => setPollutionCertImage(e.target.files?.[0] || null)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="pollution_cert_expiry" className="text-right">{t('app.admin.vehicles.pollutionCertExpiry')}</Label>
              <Input id="pollution_cert_expiry" type="date" value={pollutionCertExpiry} onChange={e => setPollutionCertExpiry(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="fitness_cert_image" className="text-right">{t('app.admin.vehicles.fitnessCertImage')}</Label>
              <Input id="fitness_cert_image" type="file" accept="image/*" onChange={e => setFitnessCertImage(e.target.files?.[0] || null)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="fitness_cert_expiry" className="text-right">{t('app.admin.vehicles.fitnessCertExpiry')}</Label>
              <Input id="fitness_cert_expiry" type="date" value={fitnessCertExpiry} onChange={e => setFitnessCertExpiry(e.target.value)} className="col-span-3" />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowAddDialog(false)}>
              {t('app.admin.vehicles.cancel')}
            </Button>
            <Button onClick={handleAddVehicle}>
              {t('app.admin.vehicles.addVehicle')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Vehicle Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('app.admin.vehicles.editVehicle')}</DialogTitle>
            <DialogDescription>
              {t('app.admin.vehicles.editVehicleDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="model" className="text-right">{t('app.admin.vehicles.model')}</Label>
              <Input id="model" value={model} onChange={(e) => setModel(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="pollutionCertExpiry" className="text-right">{t('app.admin.vehicles.pollutionCertExpiry')}</Label>
              <Input type="date" id="pollutionCertExpiry" value={pollutionCertExpiry} onChange={(e) => setPollutionCertExpiry(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="fitnessCertExpiry" className="text-right">{t('app.admin.vehicles.fitnessCertExpiry')}</Label>
              <Input type="date" id="fitnessCertExpiry" value={fitnessCertExpiry} onChange={(e) => setFitnessCertExpiry(e.target.value)} className="col-span-3" />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowEditDialog(false)}>
              {t('app.admin.vehicles.cancel')}
            </Button>
            <Button onClick={handleEditVehicle}>
              {t('app.admin.vehicles.updateVehicle')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Vehicle Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('app.admin.vehicles.deleteVehicle')}</DialogTitle>
            <DialogDescription>
              {t('app.admin.vehicles.deleteVehicleDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowDeleteDialog(false)}>
              {t('app.admin.vehicles.cancel')}
            </Button>
            <Button variant="destructive" onClick={() => handleDeleteVehicle(selectedVehicle?.id || 0)}>
              {t('app.admin.vehicles.deleteVehicle')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminVehicles;
