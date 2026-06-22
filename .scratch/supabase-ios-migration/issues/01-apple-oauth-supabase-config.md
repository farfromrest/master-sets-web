Status: ready-for-human

# Configure Sign in with Apple in Supabase + Apple Developer

## Context

The web app currently uses magic-link auth. Both the web app and iOS app will use Sign in with Apple via Supabase OAuth. This issue covers the configuration work that must happen before any code changes.

## Steps

1. In Apple Developer Portal:
   - Create a Service ID (for web OAuth callback) — e.g. `com.derekfons.MasterSets.web`
   - Configure the Service ID with the Supabase OAuth callback URL as a return URL
   - Generate a private key for Sign in with Apple
   - Note the Team ID, Key ID, and download the `.p8` key file

2. In Supabase Dashboard → Authentication → Providers → Apple:
   - Enable the Apple provider
   - Enter Team ID, Service ID (client ID), Key ID, and paste the `.p8` private key contents
   - Save

3. Add the Supabase callback URL (`https://<project>.supabase.co/auth/v1/callback`) to the Apple Service ID's return URLs

4. For iOS: ensure the app's Bundle ID (`com.derekfons.PocketBinder`) is registered in the Apple Developer Portal with Sign in with Apple capability enabled

5. Add the web app's production URL (Vercel) and `localhost:3000` to Supabase's allowed redirect URLs

## Definition of Done

- Supabase Apple provider shows as enabled in the dashboard
- A test Sign in with Apple flow completes successfully in the Supabase dashboard's auth test tool or via a manual curl
