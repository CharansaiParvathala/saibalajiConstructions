# Deployment Guide

## Database Setup for Deployment

### Current Issue
Your current database configuration uses `localhost`, which only works for local development. When deployed to Vercel, your application won't be able to connect to MySQL on your laptop.

### Solution Options

## Option 1: PlanetScale (Recommended - Free)

### Step 1: Create PlanetScale Account
1. Go to [planetscale.com](https://planetscale.com)
2. Sign up for a free account
3. Create a new database

### Step 2: Get Connection Details
1. In your PlanetScale dashboard, go to your database
2. Click "Connect" 
3. Choose "Connect with MySQL"
4. Copy the connection details

### Step 3: Set Environment Variables in Vercel
1. Go to your Vercel project dashboard
2. Go to Settings → Environment Variables
3. Add these variables:

```
DB_HOST=aws.connect.psdb.cloud
DB_PORT=3306
DB_USER=your_planetscale_username
DB_PASSWORD=your_planetscale_password
DB_NAME=your_database_name
DB_SSL=true
JWT_SECRET=your_jwt_secret_key
```

### Step 4: Run Database Migrations
1. Connect to your PlanetScale database
2. Run the SQL schema from `server/db/schema.sql`

## Option 2: Railway (Free Tier)

### Step 1: Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up for a free account
3. Create a new project

### Step 2: Add MySQL Database
1. Click "New Service"
2. Choose "Database" → "MySQL"
3. Railway will provide connection details

### Step 3: Set Environment Variables
Use the connection details provided by Railway in your Vercel environment variables.

## Option 3: Supabase (PostgreSQL - Free)

Since you already have Supabase config, you could switch to PostgreSQL:

### Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a free project
3. Get your database connection string

### Step 2: Convert Schema
You'll need to convert your MySQL schema to PostgreSQL format.

## Option 4: Vercel Postgres (Easiest)

### Step 1: Add Vercel Postgres
1. In your Vercel dashboard, go to Storage
2. Click "Create Database"
3. Choose "Postgres"
4. Vercel will automatically set environment variables

### Step 2: Convert Schema
Convert your MySQL schema to PostgreSQL format.

## Environment Variables Setup

### For Local Development (.env file)
Create a `.env` file in your `server` directory:

```env
# Local MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_local_password
DB_NAME=progress_tracker
DB_SSL=false

# JWT Secret
JWT_SECRET=your_jwt_secret_key_here

# Server Configuration
PORT=3001
NODE_ENV=development
```

### For Production (Vercel Environment Variables)
Set these in your Vercel project settings:

```env
# Cloud MySQL (e.g., PlanetScale)
DB_HOST=aws.connect.psdb.cloud
DB_PORT=3306
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=your_database_name
DB_SSL=true

# JWT Secret
JWT_SECRET=your_secure_jwt_secret

# Server Configuration
NODE_ENV=production
```

## Database Migration Steps

### 1. Create Database Schema
Run the SQL from `server/db/schema.sql` in your cloud database.

### 2. Add Sample Data (Optional)
Run the SQL from `server/db/add-sample-payment-data.sql` if you want sample data.

### 3. Test Connection
Deploy your application and test the database connection.

## Security Considerations

1. **Never commit `.env` files** to version control
2. **Use strong passwords** for production databases
3. **Enable SSL** for cloud database connections
4. **Use environment variables** for all sensitive data
5. **Rotate JWT secrets** regularly

## Troubleshooting

### Common Issues:
1. **Connection timeout**: Check if your database allows external connections
2. **SSL errors**: Ensure SSL is properly configured
3. **Authentication failed**: Verify username/password
4. **Database not found**: Make sure the database exists

### Testing Connection:
Use the `/api/final-submissions/test` endpoint to test database connectivity.

## Recommended Approach

1. **Start with PlanetScale** - it's free and easy to set up
2. **Use environment variables** for all configuration
3. **Test locally** with your laptop MySQL
4. **Deploy to Vercel** with cloud database
5. **Monitor logs** for any connection issues

This setup will allow your application to work both locally and in production! 