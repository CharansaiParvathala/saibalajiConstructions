import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/sonner';
import { useLanguage } from '@/context/language-context';

interface Driver {
  id: number;
  name: string;
  mobile_number: string;
  license_number: string;
  license_type: string;
  license_image?: string;
  license_image_name?: string;
  experience: number;
  is_external: boolean;
}

const AdminDrivers = () => {
  const { t } = useLanguage();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [name, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseType, setLicenseType] = useState('');
  const [licenseImage, setLicenseImage] = useState<File | null>(null);
  const [editingDriverId, setEditingDriverId] = useState<number | null>(null);
  const expanderRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    loadDrivers();
  }, []);

  const loadDrivers = async () => {
    try {
      const res = await fetch('/api/drivers');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('Load drivers error:', errorData);
        throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      setDrivers(data);
    } catch (error: any) {
      console.error('Failed to fetch drivers:', error);
      toast.error(`Failed to fetch drivers: ${error.message}`);
    }
  };

  const handleAddDriver = async () => {
    if (!name || !mobileNumber || !licenseNumber || !licenseType) {
      toast.error('Please fill all required fields');
      return;
    }
    
    const formData = new FormData();
    formData.append('name', name);
    formData.append('mobile_number', mobileNumber);
    formData.append('license_number', licenseNumber);
    formData.append('license_type', licenseType);
    if (licenseImage) formData.append('license_image', licenseImage);
    
    try {
      const res = await fetch('/api/drivers', { 
        method: 'POST', 
        body: formData 
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('Server error:', errorData);
        throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
      }
      
      toast.success('Driver added successfully');
      setShowAddDialog(false);
      resetForm();
      loadDrivers();
    } catch (error: any) {
      console.error('Add driver error:', error);
      toast.error(`Failed to add driver: ${error.message}`);
    }
  };

  const handleEditDriver = async () => {
    if (!selectedDriver || !name || !mobileNumber || !licenseNumber || !licenseType) {
      toast.error('Please fill all required fields');
      return;
    }
    
    const formData = new FormData();
    formData.append('name', name);
    formData.append('mobile_number', mobileNumber);
    formData.append('license_number', licenseNumber);
    formData.append('license_type', licenseType);
    if (licenseImage) formData.append('license_image', licenseImage);
    
    try {
      const res = await fetch(`/api/drivers/${selectedDriver.id}`, { 
        method: 'PUT', 
        body: formData 
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('Server error:', errorData);
        throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
      }
      
      toast.success('Driver updated successfully');
      setShowEditDialog(false);
      resetForm();
      loadDrivers();
    } catch (error: any) {
      console.error('Edit driver error:', error);
      toast.error(`Failed to update driver: ${error.message}`);
    }
  };

  const handleDeleteDriver = async () => {
    if (!selectedDriver) return;
    try {
      const res = await fetch(`/api/drivers/${selectedDriver.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete driver');
      toast.success('Driver deleted successfully');
      setShowDeleteDialog(false);
      setSelectedDriver(null);
      loadDrivers();
    } catch (error: any) {
      toast.error('Failed to delete driver');
    }
  };

  const openEditInline = (driver: Driver) => {
    setSelectedDriver(driver);
    setName(driver.name);
    setMobileNumber(driver.mobile_number);
    setLicenseNumber(driver.license_number);
    setLicenseType(driver.license_type);
    setLicenseImage(null);
    setEditingDriverId(driver.id);
  };

  const closeEditInline = () => {
    setEditingDriverId(null);
    resetForm();
  };

  const resetForm = () => {
    setName('');
    setMobileNumber('');
    setLicenseNumber('');
    setLicenseType('');
    setLicenseImage(null);
    setSelectedDriver(null);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-6">{t('app.admin.drivers.manageDrivers')}</h1>
      <p className="text-muted-foreground mb-8">
        {t('app.admin.drivers.manageDriversDescription')}
      </p>
      
      <Card>
        <CardHeader>
          <CardTitle>{t('app.admin.drivers.drivers')}</CardTitle>
          <CardDescription>{t('app.admin.drivers.viewManageDrivers')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <Button onClick={() => setShowAddDialog(true)}>{t('app.admin.drivers.addDriver')}</Button>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('app.admin.drivers.name')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('app.admin.drivers.mobileNumber')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('app.admin.drivers.licenseNumber')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('app.admin.drivers.licenseType')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('app.admin.drivers.licenseImage')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('app.admin.drivers.actions')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {drivers.map((driver: Driver) => (
                    <React.Fragment key={driver.id}>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{driver.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{driver.mobile_number}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{driver.license_number}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{driver.license_type}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {driver.license_image && (
                            <a
                              href={`http://localhost:3001/api/drivers/${driver.id}/license_image`}
                              download={driver.license_image_name || `license_${driver.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-900 underline"
                            >
                              {t('app.admin.drivers.download')}
                            </a>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditInline(driver)}
                            >
                              {t('app.common.edit')}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => { setSelectedDriver(driver); setShowDeleteDialog(true); }}
                            >
                              {t('app.common.delete')}
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {editingDriverId === driver.id && (
                        <tr ref={expanderRef}>
                          <td colSpan={6} className="bg-gray-50 px-6 py-4">
                            <div className="flex flex-col gap-4">
                              <div className="flex gap-4 flex-wrap">
                                <div className="flex-1 min-w-[180px]">
                                  <Label>{t('app.admin.drivers.name')}</Label>
                                  <Input value={name} onChange={e => setName(e.target.value)} />
                                </div>
                                <div className="flex-1 min-w-[180px]">
                                  <Label>{t('app.admin.drivers.mobileNumber')}</Label>
                                  <Input value={mobileNumber} onChange={e => setMobileNumber(e.target.value)} />
                                </div>
                                <div className="flex-1 min-w-[180px]">
                                  <Label>{t('app.admin.drivers.licenseNumber')}</Label>
                                  <Input value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} />
                                </div>
                                <div className="flex-1 min-w-[180px]">
                                  <Label>{t('app.admin.drivers.licenseType')}</Label>
                                  <Input value={licenseType} onChange={e => setLicenseType(e.target.value)} />
                                </div>
                                <div className="flex-1 min-w-[180px]">
                                  <Label>{t('app.admin.drivers.licenseImage')}</Label>
                                  <Input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={e => setLicenseImage(e.target.files?.[0] || null)} 
                                  />
                                </div>
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button variant="secondary" onClick={closeEditInline}>{t('app.common.cancel')}</Button>
                                <Button onClick={handleEditDriver}>{t('app.admin.drivers.updateDriver')}</Button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('app.admin.drivers.addNewDriver')}</DialogTitle>
            <DialogDescription>{t('app.admin.drivers.addNewDriverDescription')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">{t('app.admin.drivers.name')}</Label>
              <Input type="text" id="name" value={name} onChange={e => setName(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="mobileNumber" className="text-right">{t('app.admin.drivers.mobileNumber')}</Label>
              <Input type="text" id="mobileNumber" value={mobileNumber} onChange={e => setMobileNumber(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="licenseNumber" className="text-right">{t('app.admin.drivers.licenseNumber')}</Label>
              <Input type="text" id="licenseNumber" value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="licenseType" className="text-right">{t('app.admin.drivers.licenseType')}</Label>
              <Input type="text" id="licenseType" value={licenseType} onChange={e => setLicenseType(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="licenseImage" className="text-right">{t('app.admin.drivers.licenseImage')}</Label>
              <Input 
                type="file" 
                id="licenseImage" 
                accept="image/*" 
                onChange={e => setLicenseImage(e.target.files?.[0] || null)} 
                className="col-span-3" 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>{t('app.common.cancel')}</Button>
            <Button onClick={handleAddDriver}>{t('app.admin.drivers.addDriver')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('app.admin.drivers.deleteDriver')}</DialogTitle>
            <DialogDescription>{t('app.admin.drivers.deleteDriverDescription')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>{t('app.common.cancel')}</Button>
            <Button variant="destructive" onClick={handleDeleteDriver}>{t('app.common.delete')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDrivers;
