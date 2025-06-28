import express, { Request, Response } from 'express';
import { pool } from '../db/config';
import { uploadMemory } from '../services/file-upload';
import { RowDataPacket } from 'mysql2';

const router = express.Router();

// Get all drivers
router.get('/', async (req: Request, res: Response) => {
  try {
    const [drivers] = await pool.query('SELECT * FROM drivers ORDER BY created_at DESC');
    res.json(drivers);
  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.status(500).json({ error: 'Failed to fetch drivers' });
  }
});

// Add a new driver
router.post('/', uploadMemory.fields([
  { name: 'license_image', maxCount: 1 }
]), async (req: Request, res: Response) => {
  try {
    const { name, mobile_number, license_number, license_type } = req.body;
    const license_file = req.files && (req.files as any)['license_image'] ? (req.files as any)['license_image'][0] : null;

    // Helper to get extension from originalname
    function getExtension(filename: string): string {
      return filename ? filename.split('.').pop() || '' : '';
    }

    // Compose file name
    const license_ext = license_file ? getExtension(license_file.originalname) : '';
    const license_image_name = license_file ? `${name}_${license_number}_license${license_ext ? '.' + license_ext : ''}` : null;
    const license_image_mime = license_file ? license_file.mimetype : null;
    const license_image = license_file ? license_file.buffer : null;

    if (!name || !mobile_number || !license_number || !license_type) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const [result] = await pool.query(
      'INSERT INTO drivers (name, mobile_number, license_number, license_type, license_image, license_image_name, license_image_mime) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, mobile_number, license_number, license_type, license_image, license_image_name, license_image_mime]
    );

    res.status(201).json({
      id: (result as any).insertId,
      name,
      mobile_number,
      license_number,
      license_type
    });
  } catch (error) {
    console.error('Error adding driver:', error);
    res.status(500).json({ error: 'Failed to add driver' });
  }
});

// Update a driver
router.put('/:id', uploadMemory.fields([
  { name: 'license_image', maxCount: 1 }
]), async (req: Request, res: Response) => {
  try {
    const driverId = req.params.id;
    const { name, mobile_number, license_number, license_type } = req.body;
    const license_file = req.files && (req.files as any)['license_image'] ? (req.files as any)['license_image'][0] : null;

    // Helper to get extension from originalname
    function getExtension(filename: string): string {
      return filename ? filename.split('.').pop() || '' : '';
    }

    // Compose file name
    const license_ext = license_file ? getExtension(license_file.originalname) : '';
    const license_image_name = license_file ? `${name}_${license_number}_license${license_ext ? '.' + license_ext : ''}` : null;
    const license_image_mime = license_file ? license_file.mimetype : null;
    const license_image = license_file ? license_file.buffer : null;

    if (!name || !mobile_number || !license_number || !license_type) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const [result] = await pool.query(
      'UPDATE drivers SET name = ?, mobile_number = ?, license_number = ?, license_type = ?, license_image = ?, license_image_name = ?, license_image_mime = ? WHERE id = ?',
      [name, mobile_number, license_number, license_type, license_image, license_image_name, license_image_mime, driverId]
    );

    // Get updated driver
    const [updatedDriver] = await pool.query('SELECT * FROM drivers WHERE id = ?', [driverId]) as [RowDataPacket[], any];
    res.json(updatedDriver[0]);
  } catch (error) {
    console.error('Error updating driver:', error);
    res.status(500).json({ error: 'Failed to update driver' });
  }
});

// Delete a driver
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const driverId = req.params.id;
    const [result] = await pool.query('DELETE FROM drivers WHERE id = ?', [driverId]);
    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    res.json({ message: 'Driver deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete driver' });
  }
});

// Get driver license image
router.get('/:id/license_image', async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(
      'SELECT license_image, license_image_name, license_image_mime FROM drivers WHERE id = ?',
      [req.params.id]
    );
    
    if (!rows || (rows as any[]).length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    
    const driver = (rows as any[])[0];
    
    if (!driver.license_image) {
      return res.status(404).json({ error: 'License image not found' });
    }
    
    // Set appropriate headers
    res.setHeader('Content-Type', driver.license_image_mime || 'image/jpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${driver.license_image_name || 'license.jpg'}"`);
    
    // Send the image buffer
    res.send(driver.license_image);
  } catch (error) {
    console.error('Error serving license image:', error);
    res.status(500).json({ error: 'Failed to serve license image' });
  }
});

export default router; 