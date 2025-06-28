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
import { getUsers, updateUser, apiRequest } from '@/lib/api/api-client';
import { User, UserRole } from '@/lib/types';
import { useNavigate } from 'react-router-dom';

const OwnerCredentials = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('leader');
  const [mobileNumber, setMobileNumber] = useState('');
  
  // Redirect if not owner
  useEffect(() => {
    if (user && user.role !== 'owner') {
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
      toast.error(t('app.owner.credentials.fetchError'));
    }
  };
  
  const handleEditUser = async () => {
    if (!name || !email || !role) {
      toast.error(t("app.owner.credentials.allFieldsRequired"));
      return;
    }
    try {
      const userData = {
        name,
        email,
        role,
        mobileNumber,
        ...(password && { password })
      };
      await updateUser(selectedUser!.id, userData);
      setShowEditDialog(false);
      resetForm();
      await loadUsers();
      toast.success(t("app.owner.credentials.userUpdated"));
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error(t("app.owner.credentials.updateError"));
    }
  };
  
  const handleDeleteUser = async () => {
    try {
      await apiRequest(`/users/${selectedUser!.id}`, {
        method: 'DELETE'
      });
      setShowDeleteDialog(false);
      await loadUsers();
      toast.success(t("app.owner.credentials.userDeleted"));
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error(t("app.owner.credentials.deleteError"));
    }
  };
  
  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setRole('leader');
    setMobileNumber('');
    setSelectedUser(null);
  };
  
  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setName(user.name || '');
    setEmail(user.email || '');
    setRole(user.role || 'leader');
    setMobileNumber(user.mobileNumber || '');
    setPassword('');
    setShowEditDialog(true);
  };
  
  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };
  
  const getUserCount = (role: UserRole): number => {
    return users.filter(user => user.role === role).length;
  };
  
  const getRoleLabel = (role: UserRole): string => {
    const labels: Record<UserRole, string> = {
      'admin': t('app.auth.roles.admin'),
      'leader': t('app.auth.roles.leader'),
      'checker': t('app.auth.roles.checker'),
      'owner': t('app.auth.roles.owner')
    };
    
    return labels[role] || role;
  };
  
  const handleRoleChange = (value: string) => {
    setRole(value as UserRole);
  };

  const handleResetPassword = async (userId: string) => {
    try {
      await apiRequest(`/users/${userId}/reset-password`, {
        method: 'POST'
      });
      toast.success(t("app.admin.credentials.passwordReset"));
    } catch (error) {
      console.error("Error resetting password:", error);
      toast.error(t("app.admin.credentials.resetError"));
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-6">{t("app.owner.credentials.title")}</h1>
      <p className="text-muted-foreground mb-8">
        {t("app.owner.credentials.description")}
      </p>
      
      <Card>
        <CardHeader>
          <CardTitle>{t("app.owner.credentials.userAccounts")}</CardTitle>
          <CardDescription>
            {t("app.owner.credentials.manageAccounts")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">{t("app.owner.credentials.teamLeaders")}:</p>
              <p className="text-2xl font-bold">{getUserCount('leader' as UserRole)}</p>
            </div>
            <div>
              <p className="text-sm font-medium">{t("app.owner.credentials.qualityCheckers")}:</p>
              <p className="text-2xl font-bold">{getUserCount('checker' as UserRole)}</p>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                    {t("app.owner.credentials.name")}
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                    {t("app.owner.credentials.email")}
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                    {t("app.owner.credentials.role")}
                  </th>
                  <th className="px-6 py-3 bg-gray-50"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getRoleLabel(user.role)}
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
                        className="mr-2"
                      >
                        {t("app.admin.credentials.resetPassword")}
                      </Button>
                      {user.role !== 'owner' && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => openDeleteDialog(user)}
                        >
                          {t("app.owner.credentials.delete")}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("app.owner.credentials.editUser")}</DialogTitle>
            <DialogDescription>
              {t("app.owner.credentials.editUserDetails")}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                {t("app.owner.credentials.name")}
              </Label>
              <Input
                id="name"
                className="col-span-3"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                {t("app.owner.credentials.email")}
              </Label>
              <Input
                id="email"
                className="col-span-3"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">
                {t("app.owner.credentials.password")}
              </Label>
              <Input
                id="password"
                type="password"
                className="col-span-3"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("app.owner.credentials.leaveBlank")}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                {t("app.owner.credentials.role")}
              </Label>
              <select
                id="role"
                className="col-span-3 border rounded px-2 py-1 bg-white dark:bg-[#23272f] dark:text-white"
                value={role}
                onChange={e => handleRoleChange(e.target.value)}
              >
                <option value="leader">{t("app.auth.roles.leader")}</option>
                <option value="checker">{t("app.auth.roles.checker")}</option>
                <option value="owner">{t("app.auth.roles.owner")}</option>
              </select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowEditDialog(false)}>
              {t("app.owner.credentials.cancel")}
            </Button>
            <Button onClick={handleEditUser}>
              {t("app.owner.credentials.updateUser")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete User Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("app.owner.credentials.deleteUser")}</DialogTitle>
            <DialogDescription>
              {t("app.owner.credentials.confirmDelete")}
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowDeleteDialog(false)}>
              {t("app.owner.credentials.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser}>
              {t("app.owner.credentials.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OwnerCredentials; 