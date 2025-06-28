# VPS Deployment Guide (Using MySQL Like Your Laptop)

## Overview
This guide shows you how to deploy your application to a VPS (Virtual Private Server) where you can use MySQL just like on your laptop, but with proper hosting infrastructure.

## Why VPS Instead of Vercel?

✅ **Use MySQL** - Same database you're familiar with  
✅ **Full control** - You control the entire server  
✅ **Cost effective** - $5-10/month for a good VPS  
✅ **No code changes** - Your current setup works as-is  
✅ **24/7 uptime** - Server runs continuously  

## Step 1: Choose a VPS Provider

### Recommended Options:
1. **DigitalOcean** - $5/month, very popular
2. **Linode** - $5/month, good performance
3. **Vultr** - $2.50/month, budget friendly
4. **AWS EC2** - Pay per use, more complex

### Getting Started with DigitalOcean:
1. Go to [digitalocean.com](https://digitalocean.com)
2. Create an account
3. Create a new "Droplet" (VPS)
4. Choose Ubuntu 22.04 LTS
5. Choose the $5/month plan

## Step 2: Set Up Your VPS

### Connect to Your VPS:
```bash
ssh root@your_server_ip
```

### Update the System:
```bash
sudo apt update && sudo apt upgrade -y
```

### Install Required Software:
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MySQL
sudo apt install mysql-server -y

# Install Nginx (web server)
sudo apt install nginx -y

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Git
sudo apt install git -y
```

## Step 3: Configure MySQL

### Secure MySQL Installation:
```bash
sudo mysql_secure_installation
```

### Create Database and User:
```bash
sudo mysql -u root -p
```

In MySQL:
```sql
CREATE DATABASE progress_tracker;
CREATE USER 'progress_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON progress_tracker.* TO 'progress_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Import Your Schema:
```bash
# Copy your schema file to the server
sudo mysql -u root -p progress_tracker < schema.sql
```

## Step 4: Deploy Your Application

### Clone Your Repository:
```bash
cd /var/www
sudo git clone https://github.com/your-username/your-repo.git progress-tracker
sudo chown -R $USER:$USER progress-tracker
cd progress-tracker/server
```

### Install Dependencies:
```bash
npm install
```

### Create Environment File:
```bash
nano .env
```

Add your configuration:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=progress_user
DB_PASSWORD=your_secure_password
DB_NAME=progress_tracker
DB_SSL=false
JWT_SECRET=your_secure_jwt_secret
NODE_ENV=production
PORT=3001
```

### Build the Application:
```bash
npm run build
```

## Step 5: Set Up PM2 (Process Manager)

### Create PM2 Configuration:
```bash
nano ecosystem.config.js
```

Add this configuration:
```javascript
module.exports = {
  apps: [{
    name: 'progress-tracker-api',
    script: 'dist/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
};
```

### Start the Application:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Step 6: Configure Nginx (Reverse Proxy)

### Create Nginx Configuration:
```bash
sudo nano /etc/nginx/sites-available/progress-tracker
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain

    # API routes
    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Frontend (if you build it on the server)
    location / {
        root /var/www/progress-tracker/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

### Enable the Site:
```bash
sudo ln -s /etc/nginx/sites-available/progress-tracker /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Step 7: Set Up SSL (Optional but Recommended)

### Install Certbot:
```bash
sudo apt install certbot python3-certbot-nginx -y
```

### Get SSL Certificate:
```bash
sudo certbot --nginx -d your-domain.com
```

## Step 8: Deploy Frontend (Optional)

### Build Frontend on Server:
```bash
cd /var/www/progress-tracker
npm install
npm run build
```

### Or Deploy Frontend to Vercel:
Keep your frontend on Vercel and just point the API calls to your VPS.

## Step 9: Update Frontend API Configuration

If you deploy frontend to Vercel, update the API base URL:

```typescript
// In your frontend code
const API_BASE_URL = 'https://your-domain.com/api';
```

## Step 10: Monitor and Maintain

### Check Application Status:
```bash
pm2 status
pm2 logs
```

### Monitor System Resources:
```bash
htop
df -h
```

### Update Application:
```bash
cd /var/www/progress-tracker
git pull
cd server
npm install
npm run build
pm2 restart progress-tracker-api
```

## Cost Comparison

| Option | Cost | Setup Difficulty | Maintenance |
|--------|------|------------------|-------------|
| Vercel + Cloud DB | $0-20/month | Easy | Low |
| VPS (This guide) | $5-10/month | Medium | Medium |
| Expose Laptop MySQL | $0 | Hard | High |

## Benefits of VPS Approach

✅ **Same MySQL** - Use MySQL just like on your laptop  
✅ **Full control** - Install any software you need  
✅ **Cost effective** - $5-10/month total  
✅ **Scalable** - Can upgrade server as needed  
✅ **Learning experience** - Learn server administration  

## Security Considerations

1. **Firewall** - Only open necessary ports (80, 443, 22)
2. **Strong passwords** - Use secure passwords for all services
3. **Regular updates** - Keep system and software updated
4. **Backups** - Set up regular database backups
5. **SSL** - Always use HTTPS in production

This approach gives you the MySQL experience you want while providing proper hosting infrastructure! 