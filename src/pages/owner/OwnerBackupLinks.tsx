import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/context/language-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExternalLink } from 'lucide-react';
import { getAllBackupLinks } from '@/lib/api/api-client';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/sonner';
import { BackupLink } from '@/lib/types';

const OwnerBackupLinks: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [backupLinks, setBackupLinks] = useState<BackupLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not owner
  useEffect(() => {
    if (user && user.role !== 'owner') {
      navigate('/');
    }
  }, [user, navigate]);

  // Load backup links
  useEffect(() => {
    const fetchBackupLinks = async () => {
      try {
        setLoading(true);
        const links = await getAllBackupLinks();
    setBackupLinks(links);
        setError(null);
      } catch (err) {
        console.error('Error fetching backup links:', err);
        setError(t('app.owner.backupLinks.loadFailed'));
        toast.error(t('app.common.error'));
      } finally {
        setLoading(false);
      }
    };

    fetchBackupLinks();
  }, [t]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="mb-6">
          <h1 className="text-4xl font-bold">{t('app.owner.backupLinks.title')}</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{t('app.common.loading')}</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="mb-6">
          <h1 className="text-4xl font-bold">{t('app.owner.backupLinks.title')}</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{t('app.common.error')}</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
          <h1 className="text-4xl font-bold">{t('app.owner.backupLinks.title')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('app.owner.backupLinks.description')}
          </p>
      </div>

      {backupLinks.length > 0 ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('app.owner.backupLinks.linkDetails')}</TableHead>
                <TableHead>{t('app.owner.backupLinks.createdOn')}</TableHead>
                <TableHead className="text-right">{t('app.common.view')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backupLinks.map((link) => (
                <TableRow key={link.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      <span className="font-medium">{link.description || link.id}</span>
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(link.createdAt)}</TableCell>
                  <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(link.url, '_blank')}
                      >
                      {t('app.owner.backupLinks.visit')}
                      </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t('app.owner.backupLinks.noLinks')}</CardTitle>
            <CardDescription>
              {t('app.owner.backupLinks.noLinksDesc')}
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
};

export default OwnerBackupLinks;
