# Vercel Deployment Guide

## Prerequisites
1. A MongoDB Atlas account with a database cluster
2. A Vercel account
3. Environment variables configured

## Environment Variables
Before deploying, make sure to set these environment variables in your Vercel dashboard:

```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database_name?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret_key_here
NEXT_PUBLIC_APP_URL=https://your-app-name.vercel.app
```

## Deployment Steps

1. **Connect Repository to Vercel**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository

2. **Configure Environment Variables**
   - In the project settings, go to "Environment Variables"
   - Add the variables listed above
   - Make sure to add them for all environments (Production, Preview, Development)

3. **Deploy**
   - Vercel will automatically deploy your application
   - The build process should complete successfully

## MongoDB Atlas Setup

1. **Create a Database**
   - Create a new cluster in MongoDB Atlas
   - Create a database user with read/write permissions
   - Whitelist Vercel's IP addresses (or use 0.0.0.0/0 for all IPs)

2. **Get Connection String**
   - Go to "Connect" in your cluster
   - Choose "Connect your application"
   - Copy the connection string and replace `<password>` with your actual password

## Post-Deployment

1. **Test the Application**
   - Visit your deployed URL
   - Test user registration and login
   - Verify database connections are working

2. **Monitor Logs**
   - Check Vercel function logs for any errors
   - Monitor MongoDB Atlas logs for connection issues

## Troubleshooting

- **Build Errors**: Check the build logs in Vercel dashboard
- **Database Connection**: Verify MongoDB URI and network access
- **Environment Variables**: Ensure all required variables are set
- **Function Timeouts**: API routes are configured with 30-second timeout

## Files Created/Modified for Deployment

- `.env.example` - Template for environment variables
- `vercel.json` - Vercel-specific configuration
- `next.config.ts` - Optimized for production builds
- `lib/mongodb.ts` - Enhanced with production-ready connection options
- `DEPLOYMENT.md` - This deployment guide