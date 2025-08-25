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

## 🔐 Social Login Setup

The app includes Facebook login functionality using the Facebook SDK. To enable it:

### Facebook Login Setup

1. **Facebook App Configuration**: 
   - Create a Facebook app at [developers.facebook.com](https://developers.facebook.com)
   - Add Facebook Login product to your app
   - Get your App ID from the app settings

2. **App Configuration**:
   - Replace `your_facebook_app_id_here` in `app.json` with your actual Facebook App ID
   - Or set the `EXPO_PUBLIC_FACEBOOK_APP_ID` environment variable

3. **Supabase Configuration**: 
   - Enable Facebook OAuth in your Supabase project settings
   - Add your Facebook App ID and App Secret in the Facebook provider settings

The Facebook login button is available on the login page alongside email/password authentication.