import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/context/language-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExternalLink } from 'lucide-react';
import { getAllBackupLinks, BackupLink } from '@/lib/storage';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/sonner';

const OwnerBackupLinks: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [backupLinks, setBackupLinks] = useState<BackupLink[]>([]);

  // Redirect if not owner
  useEffect(() => {
    if (user && user.role !== 'owner') {
      navigate('/');
    }
  }, [user, navigate]);

  // Load backup links
  useEffect(() => {
    const links = getAllBackupLinks();
    setBackupLinks(links);
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const handleCreateLink = () => {
    // TODO: Implement create backup link functionality
    toast.success(t('owner.backupLinks.linkCreated'));
  };

  const handleDeleteLink = (linkId: string) => {
    // TODO: Implement delete backup link functionality
    toast.success(t('owner.backupLinks.linkDeleted'));
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-4xl font-bold">{t('owner.backupLinks.title')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('owner.backupLinks.description')}
          </p>
        </div>
        <Button onClick={handleCreateLink}>
          {t('owner.backupLinks.createLink')}
        </Button>
      </div>

      {backupLinks.length > 0 ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('owner.backupLinks.linkDetails')}</TableHead>
                <TableHead>{t('owner.backupLinks.createdOn')}</TableHead>
                <TableHead>{t('owner.backupLinks.expiresOn')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backupLinks.map((link) => (
                <TableRow key={link.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      <span className="font-medium">{link.id}</span>
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(link.createdAt)}</TableCell>
                  <TableCell>{formatDate(link.expiresAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(link.url, '_blank')}
                      >
                        {t('owner.backupLinks.download')}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteLink(link.id)}
                      >
                        {t('owner.backupLinks.delete')}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t('owner.backupLinks.noLinks')}</CardTitle>
            <CardDescription>
              {t('owner.backupLinks.noLinksDesc')}
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
};

export default OwnerBackupLinks;
