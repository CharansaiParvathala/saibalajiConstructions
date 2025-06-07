import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/sonner';
import { getAllVehicles, createVehicle, updateVehicle, deleteVehicle } from '@/lib/storage';
import { Vehicle } from '@/lib/types';

const AdminVehicles = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  
  const [model, setModel] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [pollutionCertExpiry, setPollutionCertExpiry] = useState('');
  const [fitnessCertExpiry, setFitnessCertExpiry] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  
  // Load vehicles on mount
  useEffect(() => {
    loadVehicles();
  }, []);
  
  const loadVehicles = () => {
    const allVehicles = getAllVehicles();
    setVehicles(allVehicles);
  };
  
  const handleAddVehicle = () => {
    if (!model || !registrationNumber || !pollutionCertExpiry || !fitnessCertExpiry) {
      toast.error("Please fill all required fields");
      return;
    }
    
    try {
      const newVehicle = createVehicle({
        model,
        registrationNumber,
        pollutionCertExpiry,
        fitnessCertExpiry,
        additionalDetails
      });
      
      if (newVehicle) {
        toast.success("Vehicle added successfully");
        setShowAddDialog(false);
        resetForm();
        loadVehicles();
      }
    } catch (error) {
      console.error("Error adding vehicle:", error);
      toast.error("Failed to add vehicle");
    }
  };
  
  const handleEditVehicle = () => {
    if (!selectedVehicle || !model || !registrationNumber || !pollutionCertExpiry || !fitnessCertExpiry) {
      toast.error("Please fill all required fields");
      return;
    }
    
    try {
      updateVehicle({
        ...selectedVehicle,
        model,
        registrationNumber,
        pollutionCertExpiry,
        fitnessCertExpiry,
        additionalDetails
      });
      
      toast.success("Vehicle updated successfully");
      setShowEditDialog(false);
      resetForm();
      loadVehicles();
    } catch (error) {
      console.error("Error updating vehicle:", error);
      toast.error("Failed to update vehicle");
    }
  };
  
  const handleDeleteVehicle = () => {
    if (!selectedVehicle) {
      toast.error("No vehicle selected");
      return;
    }
    
    try {
      deleteVehicle(selectedVehicle.id);
      toast.success("Vehicle deleted successfully");
      setShowDeleteDialog(false);
      setSelectedVehicle(null);
      loadVehicles();
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      toast.error("Failed to delete vehicle");
    }
  };
  
  const openEditDialog = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setModel(vehicle.model);
    setRegistrationNumber(vehicle.registrationNumber);
    setPollutionCertExpiry(vehicle.pollutionCertExpiry);
    setFitnessCertExpiry(vehicle.fitnessCertExpiry);
    setAdditionalDetails(vehicle.additionalDetails);
    setShowEditDialog(true);
  };
  
  const openDeleteDialog = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setShowDeleteDialog(true);
  };
  
  const resetForm = () => {
    setModel('');
    setRegistrationNumber('');
    setPollutionCertExpiry('');
    setFitnessCertExpiry('');
    setAdditionalDetails('');
    setSelectedVehicle(null);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-6">Manage Vehicles</h1>
      <p className="text-muted-foreground mb-8">
        Add, edit, and manage vehicles in the system.
      </p>
      
      <Card>
        <CardHeader>
          <CardTitle>Vehicles</CardTitle>
          <CardDescription>
            Manage vehicle details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <Button onClick={() => setShowAddDialog(true)}>Add Vehicle</Button>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registration</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pollution Cert Expiry</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fitness Cert Expiry</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {vehicles.map(vehicle => (
                    <tr key={vehicle.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{vehicle.model}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vehicle.registrationNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(vehicle.pollutionCertExpiry).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(vehicle.fitnessCertExpiry).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button variant="secondary" size="sm" onClick={() => openEditDialog(vehicle)}>Edit</Button>
                        <Button variant="destructive" size="sm" onClick={() => openDeleteDialog(vehicle)}>Delete</Button>
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
            <DialogTitle>Add Vehicle</DialogTitle>
            <DialogDescription>
              Add a new vehicle to the system.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="model" className="text-right">Model</Label>
              <Input id="model" value={model} onChange={(e) => setModel(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="registrationNumber" className="text-right">Registration Number</Label>
              <Input id="registrationNumber" value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="pollutionCertExpiry" className="text-right">Pollution Cert Expiry</Label>
              <Input type="date" id="pollutionCertExpiry" value={pollutionCertExpiry} onChange={(e) => setPollutionCertExpiry(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="fitnessCertExpiry" className="text-right">Fitness Cert Expiry</Label>
              <Input type="date" id="fitnessCertExpiry" value={fitnessCertExpiry} onChange={(e) => setFitnessCertExpiry(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="additionalDetails" className="text-right">Additional Details</Label>
              <Textarea id="additionalDetails" value={additionalDetails} onChange={(e) => setAdditionalDetails(e.target.value)} className="col-span-3" />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddVehicle}>
              Add Vehicle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Vehicle Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Vehicle</DialogTitle>
            <DialogDescription>
              Edit the details of the selected vehicle.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="model" className="text-right">Model</Label>
              <Input id="model" value={model} onChange={(e) => setModel(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="registrationNumber" className="text-right">Registration Number</Label>
              <Input id="registrationNumber" value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="pollutionCertExpiry" className="text-right">Pollution Cert Expiry</Label>
              <Input type="date" id="pollutionCertExpiry" value={pollutionCertExpiry} onChange={(e) => setPollutionCertExpiry(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="fitnessCertExpiry" className="text-right">Fitness Cert Expiry</Label>
              <Input type="date" id="fitnessCertExpiry" value={fitnessCertExpiry} onChange={(e) => setFitnessCertExpiry(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="additionalDetails" className="text-right">Additional Details</Label>
              <Textarea id="additionalDetails" value={additionalDetails} onChange={(e) => setAdditionalDetails(e.target.value)} className="col-span-3" />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditVehicle}>
              Update Vehicle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Vehicle Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Vehicle</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this vehicle? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteVehicle}>
              Delete Vehicle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminVehicles;
