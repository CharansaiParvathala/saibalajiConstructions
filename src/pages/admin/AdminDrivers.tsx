import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/sonner';
import { getAllDrivers, createDriver, updateDriver, deleteDriver } from '@/lib/storage';
import { Driver } from '@/lib/types';

const AdminDrivers = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  
  const [name, setName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseType, setLicenseType] = useState('');
  const [experience, setExperience] = useState<number>(0);
  const [isExternal, setIsExternal] = useState(false);
  const [contactNumber, setContactNumber] = useState('');
  const [address, setAddress] = useState('');
  
  // Load drivers on mount
  useEffect(() => {
    loadDrivers();
  }, []);
  
  const loadDrivers = () => {
    const allDrivers = getAllDrivers();
    setDrivers(allDrivers);
  };
  
  const handleAddDriver = () => {
    if (!name || !licenseNumber || !licenseType || experience === undefined) {
      toast.error("Please fill all required fields");
      return;
    }
    
    try {
      const newDriver = createDriver({
        name,
        licenseNumber,
        licenseType,
        experience,
        isExternal,
        contactNumber: contactNumber || undefined,
        address: address || undefined
      });
      
      if (newDriver) {
        toast.success("Driver added successfully");
        setShowAddDialog(false);
        resetForm();
        loadDrivers();
      }
    } catch (error) {
      console.error("Error adding driver:", error);
      toast.error("Failed to add driver");
    }
  };
  
  const handleEditDriver = () => {
    if (!selectedDriver || !name || !licenseNumber || !licenseType || experience === undefined) {
      toast.error("Please fill all required fields");
      return;
    }
    
    try {
      updateDriver({
        ...selectedDriver,
        name,
        licenseNumber,
        licenseType,
        experience,
        isExternal,
        contactNumber: contactNumber || undefined,
        address: address || undefined
      });
      
      toast.success("Driver updated successfully");
      setShowEditDialog(false);
      resetForm();
      loadDrivers();
    } catch (error) {
      console.error("Error updating driver:", error);
      toast.error("Failed to update driver");
    }
  };
  
  const handleDeleteDriver = () => {
    if (!selectedDriver) {
      toast.error("No driver selected");
      return;
    }
    
    try {
      deleteDriver(selectedDriver.id);
      toast.success("Driver deleted successfully");
      setShowDeleteDialog(false);
      setSelectedDriver(null);
      loadDrivers();
    } catch (error) {
      console.error("Error deleting driver:", error);
      toast.error("Failed to delete driver");
    }
  };
  
  const openEditDialog = (driver: Driver) => {
    setSelectedDriver(driver);
    setName(driver.name);
    setLicenseNumber(driver.licenseNumber);
    setLicenseType(driver.licenseType);
    setExperience(driver.experience);
    setIsExternal(driver.isExternal);
    setContactNumber(driver.contactNumber || '');
    setAddress(driver.address || '');
    setShowEditDialog(true);
  };
  
  const openDeleteDialog = (driver: Driver) => {
    setSelectedDriver(driver);
    setShowDeleteDialog(true);
  };
  
  const resetForm = () => {
    setName('');
    setLicenseNumber('');
    setLicenseType('');
    setExperience(0);
    setIsExternal(false);
    setContactNumber('');
    setAddress('');
    setSelectedDriver(null);
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-6">Manage Drivers</h1>
      <p className="text-muted-foreground mb-8">
        Add, edit, and manage drivers for your projects.
      </p>
      
      <Card>
        <CardHeader>
          <CardTitle>Drivers</CardTitle>
          <CardDescription>
            View and manage existing drivers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            {drivers.map(driver => (
              <Card key={driver.id} className="border">
                <CardContent className="grid gap-2">
                  <div className="flex justify-between">
                    <h3 className="text-lg font-semibold">{driver.name}</h3>
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
                        onClick={() => openDeleteDialog(driver)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    License: {driver.licenseNumber} ({driver.licenseType})
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Experience: {driver.experience} years
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Contact: {driver.contactNumber || 'N/A'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Address: {driver.address || 'N/A'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    External: {driver.isExternal ? 'Yes' : 'No'}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <Button onClick={() => setShowAddDialog(true)}>Add Driver</Button>
        </CardContent>
      </Card>
      
      {/* Add Driver Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Driver</DialogTitle>
            <DialogDescription>
              Enter the details for the new driver.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input 
                type="text" 
                id="name" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                className="col-span-3" 
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="licenseNumber" className="text-right">
                License Number
              </Label>
              <Input 
                type="text" 
                id="licenseNumber" 
                value={licenseNumber} 
                onChange={(e) => setLicenseNumber(e.target.value)} 
                className="col-span-3" 
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="licenseType" className="text-right">
                License Type
              </Label>
              <Input 
                type="text" 
                id="licenseType" 
                value={licenseType} 
                onChange={(e) => setLicenseType(e.target.value)} 
                className="col-span-3" 
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="experience" className="text-right">
                Experience (Years)
              </Label>
              <Input 
                type="number" 
                id="experience" 
                value={experience.toString()} 
                onChange={(e) => setExperience(parseInt(e.target.value))} 
                className="col-span-3" 
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="isExternal" className="text-right">
                Is External
              </Label>
              <div className="col-span-3 flex items-center">
                <Switch 
                  id="isExternal" 
                  checked={isExternal} 
                  onCheckedChange={setIsExternal} 
                />
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="contactNumber" className="text-right">
                Contact Number
              </Label>
              <Input 
                type="text" 
                id="contactNumber" 
                value={contactNumber} 
                onChange={(e) => setContactNumber(e.target.value)} 
                className="col-span-3" 
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="address" className="text-right">
                Address
              </Label>
              <Input 
                type="text" 
                id="address" 
                value={address} 
                onChange={(e) => setAddress(e.target.value)} 
                className="col-span-3" 
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddDriver}>
              Add Driver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Driver Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Driver</DialogTitle>
            <DialogDescription>
              Edit the details for the selected driver.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input 
                type="text" 
                id="name" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                className="col-span-3" 
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="licenseNumber" className="text-right">
                License Number
              </Label>
              <Input 
                type="text" 
                id="licenseNumber" 
                value={licenseNumber} 
                onChange={(e) => setLicenseNumber(e.target.value)} 
                className="col-span-3" 
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="licenseType" className="text-right">
                License Type
              </Label>
              <Input 
                type="text" 
                id="licenseType" 
                value={licenseType} 
                onChange={(e) => setLicenseType(e.target.value)} 
                className="col-span-3" 
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="experience" className="text-right">
                Experience (Years)
              </Label>
              <Input 
                type="number" 
                id="experience" 
                value={experience.toString()} 
                onChange={(e) => setExperience(parseInt(e.target.value))} 
                className="col-span-3" 
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="isExternal" className="text-right">
                Is External
              </Label>
              <div className="col-span-3 flex items-center">
                <Switch 
                  id="isExternal" 
                  checked={isExternal} 
                  onCheckedChange={setIsExternal} 
                />
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="contactNumber" className="text-right">
                Contact Number
              </Label>
              <Input 
                type="text" 
                id="contactNumber" 
                value={contactNumber} 
                onChange={(e) => setContactNumber(e.target.value)} 
                className="col-span-3" 
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="address" className="text-right">
                Address
              </Label>
              <Input 
                type="text" 
                id="address" 
                value={address} 
                onChange={(e) => setAddress(e.target.value)} 
                className="col-span-3" 
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditDriver}>
              Update Driver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Driver Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Driver</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this driver?
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteDriver}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDrivers;
