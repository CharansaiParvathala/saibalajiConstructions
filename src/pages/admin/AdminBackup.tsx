import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/context/language-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/components/ui/sonner';
import { Link2, Edit2 } from 'lucide-react';
import { getAllBackupLinks, createBackupLink, updateBackupLink, BackupLink } from '@/lib/api/api-client';
import { useNavigate } from 'react-router-dom';

const AdminBackup = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [backupLinks, setBackupLinks] = useState<BackupLink[]>([]);
  const [newLink, setNewLink] = useState({ url: '', description: '' });
  const [editingLink, setEditingLink] = useState<BackupLink | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLinks, setIsLoadingLinks] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

  // Load backup links
  useEffect(() => {
    const loadBackupLinks = async () => {
      try {
        setIsLoadingLinks(true);
        const links = await getAllBackupLinks();
        setBackupLinks(links);
      } catch (error) {
        console.error('Error loading backup links:', error);
        toast.error('Failed to load backup links');
      } finally {
        setIsLoadingLinks(false);
      }
    };

    if (user?.role === 'admin') {
      loadBackupLinks();
    }
  }, [user]);

  const handleAddBackupLink = async () => {
    if (!newLink.url || !newLink.description) {
      toast.error(t("app.admin.backup.allFieldsRequired"));
      return;
    }

    if (!newLink.url.startsWith('http')) {
      toast.error(t("app.admin.backup.invalidUrl"));
      return;
    }

    setIsLoading(true);
    try {
      const savedLink = await createBackupLink({
        url: newLink.url,
        description: newLink.description
      });
      
      setBackupLinks(prev => [...prev, savedLink]);
      setNewLink({ url: '', description: '' });
      
      toast.success(t("app.admin.backup.linkAdded"));
    } catch (error) {
      console.error("Error adding backup link:", error);
      toast.error(t("app.admin.backup.addError"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateLink = async () => {
    if (!editingLink) return;

    if (!editingLink.url || !editingLink.description) {
      toast.error(t("app.admin.backup.allFieldsRequired"));
      return;
    }

    if (!editingLink.url.startsWith('http')) {
      toast.error(t("app.admin.backup.invalidUrl"));
      return;
    }

    setIsUpdating(true);
    try {
      const updatedLink = await updateBackupLink(editingLink.id, {
        url: editingLink.url,
        description: editingLink.description
      });
      
      setBackupLinks(prev => prev.map(link => 
        link.id === editingLink.id ? updatedLink : link
      ));
      setEditingLink(null);
      setIsDialogOpen(false); // Close the dialog
      
      toast.success('Backup link updated successfully');
    } catch (error) {
      console.error("Error updating backup link:", error);
      toast.error('Failed to update backup link');
    } finally {
      setIsUpdating(false);
    }
  };

  const openEditDialog = (link: BackupLink) => {
    setEditingLink({ ...link });
    setIsDialogOpen(true);
  };

  const closeEditDialog = () => {
    setEditingLink(null);
    setIsDialogOpen(false);
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      // Reset the editing state when dialog closes
      setEditingLink(null);
    }
    setIsDialogOpen(open);
  };

  if (isLoadingLinks) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading backup links...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-6">{t("app.admin.backup.title")}</h1>
      <p className="text-muted-foreground mb-8">
        {t("app.admin.backup.description")}
      </p>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("app.admin.backup.addNewLink")}</CardTitle>
            <CardDescription>
              {t("app.admin.backup.addLinkDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">{t("app.admin.backup.url")}</Label>
              <Input
                id="url"
                value={newLink.url}
                onChange={(e) => setNewLink(prev => ({ ...prev, url: e.target.value }))}
                placeholder={t("app.admin.backup.enterUrl")}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">{t("app.admin.backup.description")}</Label>
              <Textarea
                id="description"
                value={newLink.description}
                onChange={(e) => setNewLink(prev => ({ ...prev, description: e.target.value }))}
                placeholder={t("app.admin.backup.enterDescription")}
              />
            </div>
            
            <Button 
              onClick={handleAddBackupLink} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? t("app.admin.backup.adding") : t("app.admin.backup.addLink")}
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>{t("app.admin.backup.existingLinks")}</CardTitle>
            <CardDescription>
              {t("app.admin.backup.manageLinks")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {backupLinks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No backup links found</p>
                <p className="text-sm">Add your first backup link using the form on the left</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("app.admin.backup.url")}</TableHead>
                    <TableHead>{t("app.admin.backup.description")}</TableHead>
                    <TableHead>{t("app.admin.backup.createdAt")}</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backupLinks.map(link => (
                    <TableRow key={link.id}>
                      <TableCell>
                        <a 
                          href={link.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-blue-600 hover:underline"
                        >
                          <Link2 size={16} />
                          {link.url}
                        </a>
                      </TableCell>
                      <TableCell>{link.description}</TableCell>
                      <TableCell>
                        {new Date(link.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(link)}
                            >
                              <Edit2 size={16} className="text-blue-600" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent key={editingLink?.id || 'new'}>
                            <DialogHeader>
                              <DialogTitle>Edit Backup Link</DialogTitle>
                              <DialogDescription>
                                Update the backup link URL and description.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="edit-url">URL</Label>
                                <Input
                                  id="edit-url"
                                  value={editingLink?.url || ''}
                                  onChange={(e) => setEditingLink(prev => 
                                    prev ? { ...prev, url: e.target.value } : null
                                  )}
                                  placeholder="Enter backup link URL"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="edit-description">Description</Label>
                                <Textarea
                                  id="edit-description"
                                  value={editingLink?.description || ''}
                                  onChange={(e) => setEditingLink(prev => 
                                    prev ? { ...prev, description: e.target.value } : null
                                  )}
                                  placeholder="Enter backup link description"
                                />
                              </div>
                              <div className="flex justify-end space-x-2">
                                <Button
                                  variant="outline"
                                  onClick={closeEditDialog}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  onClick={handleUpdateLink}
                                  disabled={isUpdating}
                                >
                                  {isUpdating ? 'Updating...' : 'Update Link'}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminBackup;
