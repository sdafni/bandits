# 🏛️ Banditour

> **Unique local tourist attractions based on indie human recommendations**  
> The ones you wouldn't find in Google or AI chats.

---

## 🚀 Tech Stack

Built with:
- **React Native** + **Expo**
- **Supabase**
- A lot of vibe coding ✨

---

## 🌍 Demo

**Currently running in Athens:**  
🔗 [https://bandits--xfd4hjefqa.expo.app/](https://bandits--xfd4hjefqa.expo.app/)

---

## 📝 Note

Sign up without validation (currently)

## 🔐 Google Sign-In Setup

The app includes Google sign-in functionality using Supabase OAuth. To enable it:

1. **Supabase Configuration**: Enable Google OAuth in your Supabase project settings
2. **Redirect URLs**: Add these URLs to your Supabase OAuth redirect URLs:
   - `bandits://auth/callback` (for mobile)
   - `https://your-domain.com/auth/callback` (for web - replace with your actual domain)
3. **Google Console**: Configure your Google OAuth credentials in the Google Cloud Console

The Google sign-in button is available on the login page alongside email/password authentication.