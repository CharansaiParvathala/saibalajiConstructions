import React, { useState, useEffect, useRef } from 'react';
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import ResponsiveModal from '@/components/ui/ResponsiveModal';

const AdminCredentials = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.LEADER);
  const [mobileNumber, setMobileNumber] = useState('');
  
  const expanderRef = useRef<HTMLTableRowElement | null>(null);
  
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
  
  useEffect(() => {
    if (!editingUserId) return;
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (expanderRef.current && !expanderRef.current.contains(event.target as Node)) {
        closeEditInline();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [editingUserId]);
  
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
      setShowEditModal(false);
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
  
  const openEditInline = (user: User) => {
    setSelectedUser(user);
    setName(user.name);
    setEmail(user.email);
    setPassword('');
    setRole(user.role);
    setMobileNumber(user.mobileNumber || '');
    setEditingUserId(user.id);
  };
  
  const closeEditInline = () => {
    setEditingUserId(null);
    resetForm();
  };
  
  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };
  
  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setRole(UserRole.LEADER);
    setMobileNumber('');
    setSelectedUser(null);
  };
  
  const getUserCount = (role: UserRole): number => {
    return users.filter(user => user.role === role).length;
  };
  
  const getRoleLabel = (role: UserRole): string => {
    const labels: Record<UserRole, string> = {
      admin: t('app.auth.roles.admin'),
      leader: t('app.auth.roles.leader'),
      user: t('app.auth.roles.user'),
    };
    return labels[role] || role;
  };
  
  // Fixed TypeScript handler for role selection
  const handleRoleChange = (value: string) => {
    setRole(value as UserRole);
  };

  const downloadBlob = (blob: Blob, filename: string, mimeType = 'image/jpeg') => {
    const url = URL.createObjectURL(new Blob([blob], { type: mimeType }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-2 md:p-4 max-w-full w-full">
      <h1 className="text-4xl font-bold mb-6">{t("app.admin.credentials.title")}</h1>
      <p className="text-muted-foreground mb-8">
        {t("app.admin.credentials.description")}
      </p>
          <Card className="w-full max-w-full">
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
              <div className="overflow-x-auto w-full">
                <table className="min-w-[350px] w-full divide-y divide-gray-200 text-sm">
                  <thead>
                    <tr>
                      <th className="w-1/4 md:w-[180px] px-2 md:px-6 py-2 md:py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider truncate">
                        {t("app.admin.credentials.name")}
                      </th>
                      <th className="w-1/3 md:w-[220px] px-2 md:px-6 py-2 md:py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider truncate">
                        {t("app.admin.credentials.email")}
                      </th>
                      <th className="w-1/6 md:w-[120px] px-2 md:px-6 py-2 md:py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider truncate">
                        {t("app.admin.credentials.role")}
                      </th>
                      <th className="w-20 md:w-[120px] px-2 md:px-6 py-2 md:py-3 bg-gray-50 truncate"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map(user => (
                      <React.Fragment key={user.id}>
                        <tr>
                          <td className="px-2 md:px-6 py-2 md:py-4 whitespace-nowrap truncate w-1/4 md:w-[180px]">
                            <div className="text-sm font-medium text-gray-900 truncate">{user.name}</div>
                          </td>
                          <td className="px-2 md:px-6 py-2 md:py-4 whitespace-nowrap truncate w-1/3 md:w-[220px]">
                            <div className="text-sm text-gray-500 truncate">{user.email}</div>
                          </td>
                          <td className="px-2 md:px-6 py-2 md:py-4 whitespace-nowrap truncate w-1/6 md:w-[120px]">
                            <div className="text-sm text-gray-500 truncate">{getRoleLabel(user.role)}</div>
                          </td>
                          <td className="px-2 md:px-6 py-2 md:py-4 whitespace-nowrap text-right text-sm font-medium truncate w-20 md:w-[120px]">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditInline(user)}
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
                          </td>
                        </tr>
                        {editingUserId === user.id && (
                          <tr ref={expanderRef}>
                            <td colSpan={4} className="bg-gray-50 px-6 py-4">
                              <div className="flex flex-col gap-4">
                                <div className="flex gap-4 flex-wrap">
                                  <div className="flex-1 min-w-[180px]">
                                    <Label>{t('app.admin.credentials.name')}</Label>
                                    <Input value={name} onChange={e => setName(e.target.value)} />
                                  </div>
                                  <div className="flex-1 min-w-[180px]">
                                    <Label>{t('app.admin.credentials.email')}</Label>
                                    <Input value={email} onChange={e => setEmail(e.target.value)} />
                                  </div>
                                  <div className="flex-1 min-w-[140px]">
                                    <Label htmlFor="role">{t('app.admin.credentials.role')}</Label>
                                    <select
                                      id="role"
                                      className="w-full p-2 border rounded"
                                      value={role}
                                      onChange={e => setRole(e.target.value as UserRole)}
                                    >
                                      <option value="leader">{t('app.auth.roles.leader')}</option>
                                      <option value="owner">{t('app.auth.roles.owner')}</option>
                                      <option value="checker">{t('app.auth.roles.checker')}</option>
                                      <option value="admin">{t('app.auth.roles.admin')}</option>
                                    </select>
                                  </div>
                                  <div className="flex-1 min-w-[140px]">
                                    <Label>{t('app.admin.credentials.mobileNumber')}</Label>
                                    <Input value={mobileNumber} onChange={e => setMobileNumber(e.target.value)} />
                                  </div>
                                  <div className="flex-1 min-w-[140px]">
                                    <Label>{t('app.admin.credentials.password')}</Label>
                                    <Input type="password" value={password} onChange={e => setPassword(e.target.value)} />
                                  </div>
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button variant="secondary" onClick={closeEditInline}>{t('app.admin.credentials.cancel')}</Button>
                                  <Button onClick={handleEditUser}>{t('app.admin.credentials.save')}</Button>
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
              <select
                id="role"
                className="w-full p-2 border rounded"
                value={role}
                onChange={e => setRole(e.target.value as UserRole)}
              >
                <option value="leader">{t('app.auth.roles.leader')}</option>
                <option value="owner">{t('app.auth.roles.owner')}</option>
                <option value="checker">{t('app.auth.roles.checker')}</option>
                <option value="admin">{t('app.auth.roles.admin')}</option>
              </select>
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
