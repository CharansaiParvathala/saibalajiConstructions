import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/sonner';

const AdminDrivers = () => {
  const [drivers, setDrivers] = useState([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [name, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseType, setLicenseType] = useState('');
  const [licenseImage, setLicenseImage] = useState(null);

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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
      toast.error('Failed to delete driver');
    }
  };

  const openEditDialog = (driver) => {
    setSelectedDriver(driver);
    setName(driver.name);
    setMobileNumber(driver.mobile_number);
    setLicenseNumber(driver.license_number);
    setLicenseType(driver.license_type);
    setLicenseImage(null); // Reset image for edit
    setShowEditDialog(true);
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
      <h1 className="text-4xl font-bold mb-6">Manage Drivers</h1>
      <p className="text-muted-foreground mb-8">
        Add, edit, and manage drivers in the system.
      </p>
      
      <Card>
        <CardHeader>
          <CardTitle>Drivers</CardTitle>
          <CardDescription>View and manage existing drivers.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <Button onClick={() => setShowAddDialog(true)}>Add Driver</Button>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mobile Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">License Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">License Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">License Image</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {drivers.map(driver => (
                    <tr key={driver.id}>
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
                            Download
                          </a>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(driver)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => { setSelectedDriver(driver); setShowDeleteDialog(true); }}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
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
            <DialogTitle>Add New Driver</DialogTitle>
            <DialogDescription>Enter the details for the new driver.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input type="text" id="name" value={name} onChange={e => setName(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="mobileNumber" className="text-right">Mobile Number</Label>
              <Input type="text" id="mobileNumber" value={mobileNumber} onChange={e => setMobileNumber(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="licenseNumber" className="text-right">License Number</Label>
              <Input type="text" id="licenseNumber" value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="licenseType" className="text-right">License Type</Label>
              <Input type="text" id="licenseType" value={licenseType} onChange={e => setLicenseType(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="licenseImage" className="text-right">License Image</Label>
              <Input type="file" id="licenseImage" accept="image/*" onChange={e => setLicenseImage(e.target.files?.[0] || null)} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddDriver}>Add Driver</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Driver Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Driver</DialogTitle>
            <DialogDescription>Edit the details for the selected driver.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">Name</Label>
              <Input type="text" id="edit-name" value={name} onChange={e => setName(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-mobileNumber" className="text-right">Mobile Number</Label>
              <Input type="text" id="edit-mobileNumber" value={mobileNumber} onChange={e => setMobileNumber(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-licenseNumber" className="text-right">License Number</Label>
              <Input type="text" id="edit-licenseNumber" value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-licenseType" className="text-right">License Type</Label>
              <Input type="text" id="edit-licenseType" value={licenseType} onChange={e => setLicenseType(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-licenseImage" className="text-right">License Image</Label>
              <Input type="file" id="edit-licenseImage" accept="image/*" onChange={e => setLicenseImage(e.target.files?.[0] || null)} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={handleEditDriver}>Update Driver</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Driver</DialogTitle>
            <DialogDescription>Are you sure you want to delete this driver?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteDriver}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDrivers;
