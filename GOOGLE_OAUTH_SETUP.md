# Google OAuth Setup for StockTrack

This guide will help you set up Google OAuth authentication for your StockTrack application.

## 🚀 Quick Setup

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "New Project" or select an existing project
3. Give your project a name: "StockTrack" or similar

### 2. Enable Google+ API

1. In the Google Cloud Console, go to **APIs & Services** > **Library**
2. Search for "Google+ API" and enable it
3. Search for "People API" and enable it (recommended)

### 3. Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **"+ CREATE CREDENTIALS"** > **"OAuth client ID"**
3. If prompted, configure the OAuth consent screen first:
   - Choose **"External"** for user type
   - Fill in required fields:
     - App name: "StockTrack"
     - User support email: Your email
     - Developer contact email: Your email
   - Add scopes: `../auth/userinfo.email`, `../auth/userinfo.profile`
   - Add test users: Your Gmail address

4. Create OAuth client ID:
   - Application type: **"Web application"**
   - Name: "StockTrack Web Client"
   - Authorized redirect URIs:
     - `http://localhost:3000/auth/google/callback` (for development)
     - Add your production URL when deploying

### 4. Configure Environment Variables

1. After creating credentials, copy the **Client ID** and **Client Secret**
2. Create a `.env` file in your project root:

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
SESSION_SECRET=your-super-secure-session-secret-change-in-production

# Other existing variables
ALPHA_VANTAGE_API_KEY=demo
ENCRYPTION_MASTER_KEY=your-super-secure-master-key-change-this-in-production
NODE_ENV=development
PORT=3000
```

## 🔧 Development Testing

### 1. Start the Server
```bash
npm run dev
```

### 2. Test Authentication Flow

1. Navigate to `http://localhost:3000`
2. You should see the login page
3. Click "Continue with Google"
4. Complete the OAuth flow
5. You should be redirected back to the dashboard

### 3. Check User Authentication

- Open browser DevTools > Network tab
- Visit `http://localhost:3000/api/auth/me`
- Should return your user information if authenticated

## 🔒 Security Notes

### For Development
- Use `http://localhost:3000` for local testing
- The OAuth consent screen will show "unverified app" warning - this is normal for development

### For Production
- Add your production domain to authorized redirect URIs
- Submit your app for verification if you plan to have many users
- Use HTTPS for all production OAuth flows
- Change all default secrets in environment variables

## 📱 OAuth Consent Screen Setup

### Required Information
- **App name**: StockTrack
- **User support email**: Your email
- **App logo**: Optional, but recommended
- **App domain**: Your domain (for production)
- **Privacy policy**: Required for production
- **Terms of service**: Required for production

### Scopes Needed
- `../auth/userinfo.email` - Access to user email
- `../auth/userinfo.profile` - Access to user profile info

### Test Users (During Development)
Add your Gmail addresses to test the OAuth flow before publishing

## 🐛 Troubleshooting

### Common Issues

**Error: "redirect_uri_mismatch"**
- Check that your redirect URI in Google Cloud Console exactly matches your server URL
- Local development: `http://localhost:3000/auth/google/callback`

**Error: "access_denied"**
- User canceled the OAuth flow
- App not approved for external users (add email to test users)

**Error: "invalid_client"**
- Check that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
- Make sure there are no extra spaces or quotes in your `.env` file

**Session/Cookie Issues**
- Make sure `SESSION_SECRET` is set
- Check that cookies are enabled in your browser
- Clear browser cookies and try again

## 🌟 Testing the Full Flow

Once set up, you can test:

1. **Login**: Visit localhost:3000, click "Continue with Google"
2. **Authentication**: Check `/api/auth/me` endpoint
3. **Protected Routes**: Try accessing `/api/investments` (should work when logged in)
4. **Logout**: Use the logout button in the sidebar
5. **User Isolation**: Create investments and verify they're user-specific

## 📚 Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [OAuth Consent Screen](https://support.google.com/cloud/answer/10311615)
- [Passport.js Google Strategy](http://www.passportjs.org/packages/passport-google-oauth20/)

---

**🎉 You're ready to test multi-user authentication in StockTrack!** 