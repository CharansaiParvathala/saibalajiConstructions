# Vercel Deployment Guide

This guide will help you deploy your Progress Tracker application to Vercel.

## Prerequisites

1. A Vercel account
2. A MySQL database (you can use PlanetScale, Railway, or any other MySQL provider)
3. Your project code ready for deployment

## Dependencies Check

Before deploying, ensure all required dependencies are installed:

### Root Dependencies (Client + Server)
- All dependencies are already properly configured in `package.json`
- Key dependencies include: React, Vite, TypeScript, Tailwind CSS, Radix UI components
- File handling: `jszip`, `file-saver`, `docx`, `jspdf`
- Charts: `recharts`, `chart.js`
- Forms: `react-hook-form`, `@hookform/resolvers`, `zod`

### Server Dependencies
- All dependencies are properly configured in `server/package.json`
- Key dependencies include: Express, MySQL2, JWT, bcryptjs, multer, cors
- File upload handling: `multer` for multipart form data
- Authentication: `jsonwebtoken`, `bcryptjs`
- Database: `mysql2`

## Step 1: Database Setup

### Option A: PlanetScale (Recommended)
1. Go to [PlanetScale](https://planetscale.com/) and create an account
2. Create a new database
3. Get your connection string
4. Run the schema from `server/db/schema.sql` in your database

### Option B: Railway
1. Go to [Railway](https://railway.app/) and create an account
2. Create a new MySQL database
3. Get your connection details
4. Run the schema from `server/db/schema.sql` in your database

## Step 2: Environment Variables

In your Vercel project settings, add the following environment variables:

```
DB_HOST=your-database-host
DB_PORT=3306
DB_USER=your-database-user
DB_PASSWORD=your-database-password
DB_NAME=progress_tracker
JWT_SECRET=your-super-secret-jwt-key-here
NODE_ENV=production
VERCEL=true
```

## Step 3: Deploy to Vercel

### Method 1: Using Vercel CLI
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in your project root
3. Follow the prompts to connect your project

### Method 2: Using GitHub Integration
1. Push your code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "New Project"
4. Import your GitHub repository
5. Configure the build settings:
   - Framework Preset: Other
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

## Step 4: Configure Build Settings

In your Vercel project settings, ensure:

1. **Root Directory**: Leave empty (deploy from root)
2. **Build Command**: `npm run build`
3. **Output Directory**: `dist`
4. **Install Command**: `npm install`

## Step 5: Update CORS Settings

After deployment, update the CORS settings in `server/index.ts`:

```typescript
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-actual-domain.vercel.app'] 
    : true,
  credentials: true
}));
```

Replace `your-actual-domain.vercel.app` with your actual Vercel domain.

## Step 6: Test Your Deployment

1. Visit your Vercel URL
2. Test the API endpoints: `https://your-domain.vercel.app/api/health`
3. Test the frontend application
4. Verify database connectivity

## Troubleshooting

### Common Issues:

1. **Database Connection Errors**
   - Ensure your database is accessible from Vercel's servers
   - Check if your database provider allows external connections
   - Verify environment variables are correctly set

2. **Build Failures**
   - Check the build logs in Vercel dashboard
   - Ensure all dependencies are in `package.json`
   - Verify TypeScript compilation

3. **API Routes Not Working**
   - Check if the `vercel.json` configuration is correct
   - Verify the server is properly exported
   - Check CORS settings

4. **Environment Variables**
   - Ensure all required environment variables are set in Vercel
   - Check for typos in variable names
   - Redeploy after adding new environment variables

5. **Missing Dependencies**
   - Ensure all imports have corresponding dependencies in package.json
   - Check both root and server package.json files
   - Run `npm install` locally to verify all dependencies install correctly

### Debugging:

1. Check Vercel function logs in the dashboard
2. Use the `/api/health` endpoint to test server connectivity
3. Monitor database connection logs
4. Check browser console for frontend errors

## Post-Deployment

1. Set up a custom domain (optional)
2. Configure SSL certificates (automatic with Vercel)
3. Set up monitoring and analytics
4. Configure backup strategies for your database

## Security Considerations

1. Use strong JWT secrets
2. Enable HTTPS (automatic with Vercel)
3. Regularly rotate database credentials
4. Monitor for suspicious activity
5. Keep dependencies updated

## Performance Optimization

1. Enable Vercel's edge caching
2. Optimize images and assets
3. Use CDN for static files
4. Monitor function execution times
5. Optimize database queries

## Support

If you encounter issues:
1. Check Vercel's documentation
2. Review the deployment logs
3. Test locally with production environment variables
4. Contact Vercel support if needed 