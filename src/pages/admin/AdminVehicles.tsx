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

const VEHICLE_TYPES = [
  { value: 'truck', label: 'Truck' },
  { value: 'tractor', label: 'Tractor' },
  { value: 'jcb', label: 'JCB' },
  { value: 'other', label: 'Other' },
];

const AdminVehicles = () => {
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
      toast.error('Failed to fetch vehicles');
    }
  };
  
  const handleAddVehicle = async () => {
    if (!type || !model) {
      toast.error('Please fill all required fields');
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
      toast.success('Vehicle added successfully');
        setShowAddDialog(false);
        resetForm();
        loadVehicles();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to add vehicle');
    }
  };
  
  const handleEditVehicle = () => {
    if (!selectedVehicle || !model || !pollutionCertExpiry || !fitnessCertExpiry) {
      toast.error("Please fill all required fields");
      return;
    }
    
    try {
      updateVehicle({
        ...selectedVehicle,
        model,
        pollutionCertExpiry,
        fitnessCertExpiry,
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
  
  const handleDeleteVehicle = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this vehicle?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/auth/vehicles/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to delete vehicle');
      toast.success('Vehicle deleted successfully');
      loadVehicles();
    } catch (error) {
      toast.error('Failed to delete vehicle');
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RC Expiry</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pollution Cert Expiry</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fitness Cert Expiry</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RC Image</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pollution Cert Image</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fitness Cert Image</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
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
                          Delete
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
            <DialogTitle>Add Vehicle</DialogTitle>
            <DialogDescription>
              Add a new vehicle to the system.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">Type</Label>
              <select id="type" value={type} onChange={e => setType(e.target.value)} className="col-span-3 border rounded px-2 py-1">
                {VEHICLE_TYPES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="model" className="text-right">Model</Label>
              <Input id="model" value={model} onChange={e => setModel(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rc_image" className="text-right">RC Image</Label>
              <Input id="rc_image" type="file" accept="image/*" onChange={e => setRcImage(e.target.files?.[0] || null)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rc_expiry" className="text-right">RC Expiry</Label>
              <Input id="rc_expiry" type="date" value={rcExpiry} onChange={e => setRcExpiry(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="pollution_cert_image" className="text-right">Pollution Cert Image</Label>
              <Input id="pollution_cert_image" type="file" accept="image/*" onChange={e => setPollutionCertImage(e.target.files?.[0] || null)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="pollution_cert_expiry" className="text-right">Pollution Cert Expiry</Label>
              <Input id="pollution_cert_expiry" type="date" value={pollutionCertExpiry} onChange={e => setPollutionCertExpiry(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="fitness_cert_image" className="text-right">Fitness Cert Image</Label>
              <Input id="fitness_cert_image" type="file" accept="image/*" onChange={e => setFitnessCertImage(e.target.files?.[0] || null)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="fitness_cert_expiry" className="text-right">Fitness Cert Expiry</Label>
              <Input id="fitness_cert_expiry" type="date" value={fitnessCertExpiry} onChange={e => setFitnessCertExpiry(e.target.value)} className="col-span-3" />
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
              <Label htmlFor="pollutionCertExpiry" className="text-right">Pollution Cert Expiry</Label>
              <Input type="date" id="pollutionCertExpiry" value={pollutionCertExpiry} onChange={(e) => setPollutionCertExpiry(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="fitnessCertExpiry" className="text-right">Fitness Cert Expiry</Label>
              <Input type="date" id="fitnessCertExpiry" value={fitnessCertExpiry} onChange={(e) => setFitnessCertExpiry(e.target.value)} className="col-span-3" />
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
            <Button variant="destructive" onClick={() => handleDeleteVehicle(selectedVehicle?.id || 0)}>
              Delete Vehicle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminVehicles;
