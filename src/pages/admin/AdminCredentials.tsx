import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/context/language-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/sonner';
import { getUsers, createUser, updateUser, apiRequest } from '@/lib/api/api-client';
import { User, UserRole } from '@/lib/types';
import { useNavigate } from 'react-router-dom';

const AdminCredentials = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('leader');
  const [mobileNumber, setMobileNumber] = useState('');
  
  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);
  
  // Load users on mount
  useEffect(() => {
    loadUsers();
  }, []);
  
  const loadUsers = async () => {
    try {
      const allUsers = await getUsers();
    setUsers(allUsers);
    } catch (error) {
      toast.error(t('app.admin.credentials.fetchError'));
    }
  };
  
  const handleAddUser = async () => {
    if (!name || !email || !password || !role) {
      toast.error(t("app.admin.credentials.allFieldsRequired"));
      return;
    }
    try {
      const userData = {
        name,
        email,
        role,
        password,
        mobileNumber,
        createdAt: new Date().toISOString(),
        createdBy: user?.id || 'unknown'
      };
      await createUser(userData);
      setShowAddDialog(false);
      resetForm();
      await loadUsers();
      toast.success(t("app.admin.credentials.userCreated"));
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error(t("app.admin.credentials.createError"));
    }
  };
  
  const handleEditUser = async () => {
    if (!selectedUser || !name || !email || !role) {
      toast.error(t("app.admin.credentials.allFieldsRequired"));
      return;
    }
    try {
      await updateUser({
        ...selectedUser,
        name,
        email,
        password: password || selectedUser.password,
        role,
        mobileNumber
      });
      toast.success(t("app.admin.credentials.userUpdated"));
      setShowEditDialog(false);
      resetForm();
      await loadUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error(t("app.admin.credentials.updateError"));
    }
  };
  
  const handleDeleteUser = async (userId: string) => {
    try {
      await apiRequest<void>(`/users/${userId}`, { method: 'DELETE' });
      toast.success(t("app.admin.credentials.userDeleted"));
      await loadUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error(t("app.admin.credentials.deleteError"));
    }
  };
  
  const handleResetPassword = async (userId: string) => {
    try {
      await apiRequest<void>(`/auth/users/${userId}/reset-password`, { method: 'POST' });
      toast.success(t('app.admin.credentials.passwordReset'));
      await loadUsers();
    } catch (error) {
      toast.error(t('app.admin.credentials.resetError'));
    }
  };
  
  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setName(user.name);
    setEmail(user.email);
    setPassword('');
    setRole(user.role);
    setMobileNumber(user.mobileNumber || '');
    setShowEditDialog(true);
  };
  
  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };
  
  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setRole('leader');
    setMobileNumber('');
    setSelectedUser(null);
  };
  
  const getUserCount = (role: UserRole): number => {
    return users.filter(user => user.role === role).length;
  };
  
  const getRoleLabel = (role: UserRole): string => {
    const labels: Record<UserRole, string> = {
      'admin': 'Admin',
      'leader': 'Team Leader',
      'checker': 'Quality Checker',
      'owner': 'Owner'
    };
    
    return labels[role] || role;
  };
  
  // Fixed TypeScript handler for role selection
  const handleRoleChange = (value: string) => {
    setRole(value as UserRole);
  };

  const downloadBlob = (blob, filename, mimeType = 'image/jpeg') => {
    const url = URL.createObjectURL(new Blob([blob], { type: mimeType }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-6">{t("app.admin.credentials.title")}</h1>
      <p className="text-muted-foreground mb-8">
        {t("app.admin.credentials.description")}
      </p>
          <Card>
            <CardHeader>
              <CardTitle>{t("app.admin.credentials.userAccounts")}</CardTitle>
              <CardDescription>
                {t("app.admin.credentials.manageAccounts")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">{t("app.admin.credentials.adminUsers")}:</p>
              <p className="text-2xl font-bold">{getUserCount('admin' as UserRole)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">{t("app.admin.credentials.teamLeaders")}:</p>
              <p className="text-2xl font-bold">{getUserCount('leader' as UserRole)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">{t("app.admin.credentials.qualityCheckers")}:</p>
              <p className="text-2xl font-bold">{getUserCount('checker' as UserRole)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">{t("app.admin.credentials.owners")}:</p>
              <p className="text-2xl font-bold">{getUserCount('owner' as UserRole)}</p>
                </div>
              </div>
              <Button onClick={() => setShowAddDialog(true)}>{t("app.admin.credentials.addUser")}</Button>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                        {t("app.admin.credentials.name")}
                      </th>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                        {t("app.admin.credentials.email")}
                      </th>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                        {t("app.admin.credentials.role")}
                      </th>
                      <th className="px-6 py-3 bg-gray-50"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map(user => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{getRoleLabel(user.role)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(user)}
                        className="mr-2"
                      >
                        {t("app.admin.credentials.edit")}
                      </Button>
                      <Button
                        variant="secondary"
                            size="sm"
                        onClick={() => handleResetPassword(user.id)}
                          >
                        {t("app.admin.credentials.resetPassword")}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
      
      {/* Add User Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("app.admin.credentials.addNewUser")}</DialogTitle>
            <DialogDescription>
              {t("app.admin.credentials.fillUserDetails")}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                {t("app.admin.credentials.name")}
              </Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                {t("app.admin.credentials.email")}
              </Label>
              <Input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">
                {t("app.admin.credentials.password")}
              </Label>
              <Input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="mobileNumber" className="text-right">
                {t("app.admin.credentials.mobileNumber")}
              </Label>
              <Input id="mobileNumber" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                {t("app.admin.credentials.role")}
              </Label>
              <Select value={role} onValueChange={handleRoleChange}>
                <SelectTrigger id="role" className="col-span-3">
                  <SelectValue placeholder={t("app.admin.credentials.selectRole")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">{t("app.auth.roles.admin")}</SelectItem>
                  <SelectItem value="leader">{t("app.auth.roles.leader")}</SelectItem>
                  <SelectItem value="checker">{t("app.auth.roles.checker")}</SelectItem>
                  <SelectItem value="owner">{t("app.auth.roles.owner")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowAddDialog(false)}>
              {t("app.admin.credentials.cancel")}
            </Button>
            <Button onClick={handleAddUser}>
              {t("app.admin.credentials.createUser")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("app.admin.credentials.editUser")}</DialogTitle>
            <DialogDescription>
              {t("app.admin.credentials.editUserDetails")}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                {t("app.admin.credentials.name")}
              </Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                {t("app.admin.credentials.email")}
              </Label>
              <Input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">
                {t("app.admin.credentials.password")}
              </Label>
              <Input type="password" id="password" placeholder={t("app.admin.credentials.leaveBlank")} onChange={(e) => setPassword(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="mobileNumber" className="text-right">
                {t("app.admin.credentials.mobileNumber")}
              </Label>
              <Input id="mobileNumber" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                {t("app.admin.credentials.role")}
              </Label>
              <Select value={role} onValueChange={handleRoleChange}>
                <SelectTrigger id="role" className="col-span-3">
                  <SelectValue placeholder={t("app.admin.credentials.selectRole")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">{t("app.auth.roles.admin")}</SelectItem>
                  <SelectItem value="leader">{t("app.auth.roles.leader")}</SelectItem>
                  <SelectItem value="checker">{t("app.auth.roles.checker")}</SelectItem>
                  <SelectItem value="owner">{t("app.auth.roles.owner")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowEditDialog(false)}>
              {t("app.admin.credentials.cancel")}
            </Button>
            <Button onClick={handleEditUser}>
              {t("app.admin.credentials.updateUser")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete User Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("app.admin.credentials.deleteUser")}</DialogTitle>
            <DialogDescription>
              {t("app.admin.credentials.confirmDelete")}
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowDeleteDialog(false)}>
              {t("app.admin.credentials.cancel")}
            </Button>
            <Button variant="destructive" onClick={() => handleDeleteUser(selectedUser?.id || '')}>
              {t("app.admin.credentials.deleteUser")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCredentials;
