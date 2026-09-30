# Setting up Supabase for SubTrack

Supabase gives SubTrack two things: **accounts** (sign up and sign in) and a **database** that stores
your subscriptions. Follow these steps in order. It takes about 15 minutes.

You'll end up filling in two settings files:

- `app/.env`: settings for the phone app
- `backend/.env`: settings for the server

---

## Step 1: Create the project

1. Go to https://supabase.com and sign in.
2. Click **New project**.
3. Fill in:
   - **Name:** `subtrack`
   - **Database password:** click **Generate a password**, then copy it into a notes file. You need
     it in Step 4, and Supabase won't show it again.
   - **Region:** the one closest to you.
4. Click **Create new project** and wait about 2 minutes.

---

## Step 2: Find your project URL

Look at your browser's address bar. It looks like this:

```
https://supabase.com/dashboard/project/abcdefghijklmnop/...
```

The letters after `/project/` are your **project ID**. Your project URL is:

```
https://abcdefghijklmnop.supabase.co
```

(with your own project ID in place of `abcdefghijklmnop`). Write it down.

---

## Step 3: Find your publishable key

1. Click the **gear icon** (Project Settings) in the left sidebar.
2. Click **API Keys**.
3. Copy the **Publishable key**. It starts with `sb_publishable_`.

Do **not** use the **Secret key** (`sb_secret_...`). SubTrack doesn't need it.

---

## Step 4: Find your database address

1. Click the **Connect** button at the top of the dashboard.
2. Choose **Session pooler**.
3. Copy the line that starts with `postgresql://`. It looks like this:
   ```
   postgresql://postgres.abcdefghijklmnop:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
   ```
4. Change two things in it:
   - Replace `[YOUR-PASSWORD]` with your password from Step 1 (remove the square brackets too).
   - Change `postgresql://` at the start to `postgresql+asyncpg://`.

If your password contains `@`, `#`, `/`, `?` or `%`, the connection will fail. Reset it under
**Project Settings → Database → Reset database password** and choose one with only letters and
numbers.

---

## Step 5: Fill in `app/.env`

1. In the `app` folder, copy the file `.env.example` and name the copy `.env`.
2. Open `.env` and fill it in:

```
EXPO_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
EXPO_PUBLIC_API_URL=http://192.168.1.10:8000
EXPO_PUBLIC_GOOGLE_AUTH=false
```

- `EXPO_PUBLIC_SUPABASE_URL`: your project URL from Step 2.
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: your publishable key from Step 3.
- `EXPO_PUBLIC_API_URL`: your computer's address on your Wi-Fi. To find it, open PowerShell, type
  `ipconfig`, and look for **IPv4 Address**. Keep `http://` in front and `:8000` at the end.

---

## Step 6: Fill in `backend/.env`

1. In the `backend` folder, copy `.env.example` and name the copy `.env`.
2. Open `.env` and fill it in:

```
DATABASE_URL=postgresql+asyncpg://postgres.abcdefghijklmnop:YourPassword@aws-0-us-east-1.pooler.supabase.com:5432/postgres
SUPABASE_URL=https://abcdefghijklmnop.supabase.co
SUPABASE_JWT_SECRET=
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-opus-5
CORS_ORIGINS=http://localhost:8081
```

- `DATABASE_URL`: the address you edited in Step 4.
- `SUPABASE_URL`: the same project URL as Step 2.
- `SUPABASE_JWT_SECRET`: leave it empty.
- `ANTHROPIC_API_KEY`: your Claude API key.

---

## Step 7: Turn off email confirmation (for testing)

1. In the left sidebar, go to **Authentication → Sign In / Providers**.
2. Click **Email** and turn off **Confirm email**, then save.

Without this, every new account has to click a link in an email before it can sign in.

---

## Step 8: Create the database tables

Open PowerShell and run these two lines:

```powershell
cd C:\Users\osaka\OneDrive\Desktop\SubTrack\backend
.venv\Scripts\alembic upgrade head
```

It worked if you see `Running upgrade -> 0001_init`. You can also check in Supabase: click
**Table Editor** in the sidebar. You should see four tables: `subscriptions`, `usage_logs`,
`insights` and `summaries`.

That's it for Supabase. Next, start the app (see "Running it locally" in the main README).

---

## Optional: Google sign-in

Skip this until everything else works.

1. **Authentication → Sign In / Providers → Google**: turn it on and follow Supabase's instructions.
2. **Authentication → URL Configuration → Redirect URLs**: add `subtrack://`.
3. In `app/.env`, set `EXPO_PUBLIC_GOOGLE_AUTH=true`.

---

## If something goes wrong

| What you see | What to do |
| --- | --- |
| `password authentication failed` | The password in `DATABASE_URL` is wrong. Reset it (Step 4) and update `backend/.env`. |
| `could not translate host name` or a timeout | You copied the wrong connection line. Use **Session pooler** in Step 4. |
| The app says "Set EXPO_PUBLIC_SUPABASE_URL…" | `app/.env` is missing or misnamed. It must be called exactly `.env`, not `.env.txt`. |
| The app says "Can't reach SubTrack right now" | The backend isn't running, or `EXPO_PUBLIC_API_URL` has the wrong IP address. |
