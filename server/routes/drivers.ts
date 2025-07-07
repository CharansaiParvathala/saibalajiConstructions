import express, { Request, Response } from 'express';
import { pool } from '../db/config';
import { uploadMemory } from '../services/file-upload';

const router = express.Router();

// Get all drivers
router.get('/', async (req: Request, res: Response) => {
  try {
    console.log('Fetching all drivers...');
    const [rows] = await pool.query('SELECT * FROM drivers');
    console.log(`Found ${(rows as any[]).length} drivers`);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.status(500).json({ error: 'Failed to fetch drivers', details: (error as Error).message });
  }
});

// Add a new driver with license image
router.post('/', uploadMemory.single('license_image'), async (req: Request, res: Response) => {
  try {
    const { name, mobile_number, license_number, license_type } = req.body;
    const license_file = req.file;
    function getExtension(filename) {
      return filename ? filename.split('.').pop() : '';
    }
    const license_image_name = license_file ? `${name}_license.${getExtension(license_file.originalname)}` : null;
    const license_image_mime = license_file ? license_file.mimetype : null;
    const license_image = license_file ? license_file.buffer : null;
    if (!name || !mobile_number || !license_number || !license_type) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const [result] = await pool.query(
      `INSERT INTO drivers (
        name, mobile_number, license_number, license_type, license_image, license_image_name, license_image_mime
      ) VALUES (?, ?, ?, ?, ?, ?, ?)` ,
      [name, mobile_number, license_number, license_type, license_image, license_image_name, license_image_mime]
    );
    res.status(201).json({
      id: (result as any).insertId,
      name,
      mobile_number,
      license_number,
      license_type,
      license_image_name,
      license_image_mime
    });
  } catch (error) {
    console.error('Error adding driver:', error);
    res.status(500).json({ error: 'Failed to add driver', errorMessage: (error as Error).message });
  }
});

// Delete a driver
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const [result] = await pool.query('DELETE FROM drivers WHERE id = ?', [req.params.id]);
    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    res.json({ message: 'Driver deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete driver' });
  }
});

// Update a driver
router.put('/:id', uploadMemory.single('license_image'), async (req: Request, res: Response) => {
  try {
    const { name, mobile_number, license_number, license_type } = req.body;
    const license_file = req.file;
    const driverId = req.params.id;
    
    if (!name || !mobile_number || !license_number || !license_type) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    // Check if driver exists
    const [existingDriver] = await pool.query('SELECT * FROM drivers WHERE id = ?', [driverId]);
    if ((existingDriver as any[]).length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    
    let updateQuery = `
      UPDATE drivers 
      SET name = ?, mobile_number = ?, license_number = ?, license_type = ?, updated_at = CURRENT_TIMESTAMP
    `;
    let queryParams = [name, mobile_number, license_number, license_type];
    
    // Handle license image update if provided
    if (license_file) {
      function getExtension(filename) {
        return filename ? filename.split('.').pop() : '';
      }
      const license_image_name = `${name}_license.${getExtension(license_file.originalname)}`;
      const license_image_mime = license_file.mimetype;
      const license_image = license_file.buffer;
      
      updateQuery += `, license_image = ?, license_image_name = ?, license_image_mime = ?`;
      queryParams.push(license_image, license_image_name, license_image_mime);
    }
    
    updateQuery += ` WHERE id = ?`;
    queryParams.push(driverId);
    
    await pool.query(updateQuery, queryParams);
    
    // Get updated driver data
    const [updatedDriver] = await pool.query('SELECT * FROM drivers WHERE id = ?', [driverId]);
    
    res.json(updatedDriver[0]);
  } catch (error) {
    console.error('Error updating driver:', error);
    res.status(500).json({ error: 'Failed to update driver', errorMessage: (error as Error).message });
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