# Database Image Storage Migration Guide

## Overview
This migration moves progress and payment request images from local file storage to MySQL database BLOB storage. This provides better data integrity, easier backups, and eliminates orphaned files.

## Changes Made

### 1. Database Schema Updates

#### Progress Images Table
```sql
ALTER TABLE progress_images 
ADD COLUMN image_data LONGBLOB NOT NULL AFTER image_url;
```

#### Payment Request Images Table
```sql
ALTER TABLE payment_request_images 
ADD COLUMN image_data LONGBLOB NOT NULL AFTER image_url;
```

### 2. Server-Side Changes

#### Progress Route (`server/routes/progress.ts`)
- Images are now stored as BLOB data in the database
- Temporary files are cleaned up after storage
- Added `/progress/image/:imageId` endpoint to serve images
- BLOB data is converted to base64 for API responses

#### Payment Requests Route (`server/routes/payment-requests.ts`)
- Similar changes to progress route
- Added `/payment-requests/image/:imageId` endpoint
- First image stored in `payment_requests.proof_of_payment`
- Additional images stored in `payment_request_images.image_data`

### 3. Client-Side Changes

#### API Client (`src/lib/api/api-client.ts`)
- Added `getProgressImage()` and `getPaymentRequestImage()` functions
- Updated image handling to work with BLOB data
- Images are fetched as Blob objects from database

#### Image Utilities (`src/lib/utils/image-utils.ts`)
- New utility functions for handling BLOB images
- `base64ToBlobUrl()` - Convert base64 to displayable URL
- `getProgressImageUrl()` - Fetch and display progress images
- `getPaymentRequestImageUrl()` - Fetch and display payment request images
- `revokeBlobUrl()` - Clean up memory leaks

## Migration Steps

### 1. Update Database Schema
Run the migration script:
```sql
-- Execute server/db/migrate-to-blob-storage.sql
```

### 2. Deploy Updated Code
- Deploy the updated server routes
- Deploy the updated client code
- Restart your application

### 3. Handle Existing Data
**Important**: Existing images in the `uploads/` folder will not be automatically migrated. You have two options:

#### Option A: Manual Migration (Recommended)
1. Create a script to read existing files and insert them into the database
2. Update the `image_url` fields to point to the new database records
3. Keep the original files as backup

#### Option B: Fresh Start
1. Clear existing image records from the database
2. Delete the `uploads/` folder
3. Start fresh with new uploads

## Benefits of Database Storage

### ✅ Advantages
- **Data Integrity**: Images are part of the database transaction
- **No Orphaned Files**: Images are deleted when records are deleted
- **Easier Backups**: All data in one place
- **Cloud Ready**: No file system dependencies
- **Atomic Operations**: Image upload and record creation in one transaction

### ⚠️ Considerations
- **Database Size**: Images will increase database size significantly
- **Performance**: BLOB queries may be slower than file system access
- **Memory Usage**: Images are loaded into memory when served
- **Backup Size**: Database backups will be larger

## Usage Examples

### Displaying Progress Images
```typescript
import { displayImage } from '../lib/utils/image-utils';

// For base64 data (from API response)
const imageUrl = displayImage(progress.image_proof, 'base64');

// For database-stored images
const imageUrl = await displayImage(imageId, 'progress');
```

### Displaying Payment Request Images
```typescript
// For base64 data
const imageUrl = displayImage(paymentRequest.proof_of_payment, 'base64');

// For database-stored images
const imageUrl = await displayImage(imageId, 'payment-request');
```

## API Endpoints

### Progress Images
- `GET /api/progress/image/:imageId` - Get progress image by ID
- `POST /api/progress` - Create progress with images (now stores in DB)

### Payment Request Images
- `GET /api/payment-requests/image/:imageId` - Get payment request image by ID
- `POST /api/payment-requests` - Create payment request with images (now stores in DB)

## Troubleshooting

### Common Issues

1. **Images not displaying**
   - Check if the image ID exists in the database
   - Verify the API endpoint is working
   - Check browser console for errors

2. **Large database size**
   - Consider implementing image compression
   - Set up regular database maintenance
   - Monitor storage usage

3. **Performance issues**
   - Add database indexes on image tables
   - Consider implementing image caching
   - Optimize image sizes before upload

### Monitoring
- Monitor database size growth
- Check image upload success rates
- Monitor API response times for image endpoints

## Rollback Plan

If you need to rollback to local file storage:

1. Restore the original route files
2. Remove the `image_data` columns from the database
3. Restore the original file upload configuration
4. Update client code to use local file paths

## Future Enhancements

1. **Image Compression**: Implement server-side image compression
2. **CDN Integration**: Use a CDN for better image delivery
3. **Image Thumbnails**: Generate and store thumbnails
4. **Cloud Storage**: Move to AWS S3 or similar for scalability 