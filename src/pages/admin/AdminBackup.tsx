import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/context/language-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/components/ui/sonner';
import { Link2, Trash2, ExternalLink } from 'lucide-react';
import { getAllBackupLinks, createBackupLink, deleteBackupLink, BackupLink } from '@/lib/storage';
import { useNavigate } from 'react-router-dom';

const AdminBackup = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [backupLinks, setBackupLinks] = useState<BackupLink[]>([]);
  const [newLink, setNewLink] = useState({ url: '', description: '' });
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

  // Load backup links
  useEffect(() => {
    const links = getAllBackupLinks();
    setBackupLinks(links);
  }, []);

  const handleAddBackupLink = () => {
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
      const backupLinkData = {
        url: newLink.url,
        description: newLink.description,
        createdAt: new Date().toISOString(),
        createdBy: user?.id || 'unknown'
      };

      const savedLink = createBackupLink(backupLinkData);
      
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

  const handleDeleteLink = (id: string) => {
    try {
      deleteBackupLink(id);
      setBackupLinks(prev => prev.filter(link => link.id !== id));
      toast.success(t("app.admin.backup.linkDeleted"));
    } catch (error) {
      console.error("Error deleting backup link:", error);
      toast.error(t("app.admin.backup.deleteError"));
    }
  };

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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("app.admin.backup.url")}</TableHead>
                  <TableHead>{t("app.admin.backup.description")}</TableHead>
                  <TableHead>{t("app.admin.backup.createdAt")}</TableHead>
                  <TableHead></TableHead>
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteLink(link.id)}
                      >
                        <Trash2 size={16} className="text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminBackup;
