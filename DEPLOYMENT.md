# FarmNetworks Production Deployment Guide

## Prerequisites

1. **Supabase Setup**: Ensure your Supabase project is configured and you have the production URL and anon key
2. **Environment Variables**: Set up your production environment variables
3. **Domain**: Have a domain name ready (optional but recommended)

## Environment Variables

Create a `.env` file in your project root with the following variables:

```env
# Supabase Configuration
PUBLIC_SUPABASE_URL=your_supabase_project_url
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Production Environment
NODE_ENV=production
```

## Deployment Options

### Option 1: Traditional Server Deployment

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Start the production server**:
   ```bash
   npm start
   ```

3. **Using PM2 for process management**:
   ```bash
   npm install -g pm2
   pm2 start build --name "farmnetworks"
   pm2 save
   pm2 startup
   ```

### Option 2: Docker Deployment

1. **Build and run with Docker**:
   ```bash
   docker build -t farmnetworks .
   docker run -p 3000:3000 --env-file .env farmnetworks
   ```

2. **Using Docker Compose**:
   ```bash
   docker-compose up -d
   ```

### Option 3: Cloud Platform Deployment

#### Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Deploy: `vercel --prod`

#### Netlify
1. Install Netlify CLI: `npm install -g netlify-cli`
2. Deploy: `netlify deploy --prod`

#### Railway
1. Connect your GitHub repository
2. Set environment variables in Railway dashboard
3. Deploy automatically

#### Render
1. Connect your GitHub repository
2. Set build command: `npm run build`
3. Set start command: `npm start`
4. Configure environment variables

## Production Checklist

- [ ] Environment variables configured
- [ ] Supabase production database set up
- [ ] SSL certificate configured (if using custom domain)
- [ ] Database migrations applied
- [ ] Error monitoring set up (e.g., Sentry)
- [ ] Performance monitoring configured
- [ ] Backup strategy implemented
- [ ] Security headers configured
- [ ] Rate limiting implemented
- [ ] CORS settings configured

## Monitoring and Maintenance

### Health Checks
- Application health: `http://your-domain/health`
- Database connectivity
- External service dependencies

### Logs
- Application logs
- Error logs
- Access logs

### Performance
- Response times
- Memory usage
- CPU usage
- Database query performance

## Security Considerations

1. **Environment Variables**: Never commit `.env` files to version control
2. **HTTPS**: Always use HTTPS in production
3. **CORS**: Configure CORS properly for your domain
4. **Rate Limiting**: Implement rate limiting for API endpoints
5. **Input Validation**: Ensure all user inputs are validated
6. **SQL Injection**: Use parameterized queries
7. **XSS Protection**: Sanitize user inputs
8. **CSRF Protection**: Implement CSRF tokens where necessary

## Troubleshooting

### Common Issues

1. **Build Failures**: Check Node.js version compatibility
2. **Environment Variables**: Ensure all required variables are set
3. **Database Connection**: Verify Supabase credentials
4. **Port Conflicts**: Ensure port 3000 is available
5. **Memory Issues**: Monitor memory usage and optimize if needed

### Debug Commands

```bash
# Check application status
pm2 status

# View logs
pm2 logs farmnetworks

# Restart application
pm2 restart farmnetworks

# Check system resources
htop
df -h
free -h
```

## Support

For deployment issues, check:
1. Application logs
2. System logs
3. Network connectivity
4. Database connectivity
5. Environment variable configuration 