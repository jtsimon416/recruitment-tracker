# Security Setup Guide
## Securing Candidates Table & Resumes Storage Bucket

This guide will help you secure your recruitment tracker by:
1. Adding Row Level Security (RLS) to the candidates table
2. Securing the resumes storage bucket

---

## Part 1: Secure the Candidates Table

### Option A: Using the Migration File (Recommended)

The migration file has already been created at:
`supabase/migrations/20250203_secure_candidates_table.sql`

**Steps:**
1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor** (left sidebar)
4. Click **"New Query"**
5. Copy and paste the contents of `supabase/migrations/20250203_secure_candidates_table.sql`
6. Click **"Run"** to execute the migration
7. ✅ Your candidates table is now secured!

### Option B: Manual SQL Execution

If you prefer to run the SQL directly, here's the complete script:

```sql
-- Enable Row Level Security on the candidates table
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view all candidates
CREATE POLICY "Authenticated users can view candidates"
  ON candidates
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert candidates
CREATE POLICY "Authenticated users can insert candidates"
  ON candidates
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can update candidates
CREATE POLICY "Authenticated users can update candidates"
  ON candidates
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can delete candidates
CREATE POLICY "Authenticated users can delete candidates"
  ON candidates
  FOR DELETE
  TO authenticated
  USING (true);
```

### ✅ Verification
After running the migration:
1. Go to **Table Editor** → **candidates**
2. You should see "Row Level Security: Enabled" at the top
3. Click the shield icon to view the policies
4. You should see 4 policies (SELECT, INSERT, UPDATE, DELETE)

---

## Part 2: Secure the Resumes Storage Bucket

### Steps to Secure Storage Bucket

1. **Go to Supabase Dashboard** → Your Project
2. Navigate to **Storage** (left sidebar)
3. Find your **resumes** bucket
4. Click on the bucket name
5. Click **"Policies"** tab (or the shield icon)
6. Click **"New Policy"**

### Policy 1: Allow Authenticated Users to Upload Resumes

```sql
Policy Name: Authenticated users can upload resumes
Allowed operation: INSERT
Target roles: authenticated

Policy definition:
(
  auth.role() = 'authenticated'
)
```

**Quick Setup:**
- Click "Create a policy from scratch"
- Name: `Authenticated users can upload resumes`
- Policy Command: `INSERT`
- Target roles: `authenticated`
- USING expression: `true`

### Policy 2: Allow Authenticated Users to View Resumes

```sql
Policy Name: Authenticated users can view resumes
Allowed operation: SELECT
Target roles: authenticated

Policy definition:
(
  auth.role() = 'authenticated'
)
```

**Quick Setup:**
- Click "New Policy"
- Name: `Authenticated users can view resumes`
- Policy Command: `SELECT`
- Target roles: `authenticated`
- USING expression: `true`

### Policy 3: Allow Authenticated Users to Update Resumes

```sql
Policy Name: Authenticated users can update resumes
Allowed operation: UPDATE
Target roles: authenticated

Policy definition:
(
  auth.role() = 'authenticated'
)
```

**Quick Setup:**
- Click "New Policy"
- Name: `Authenticated users can update resumes`
- Policy Command: `UPDATE`
- Target roles: `authenticated`
- USING expression: `true`

### Policy 4: Allow Authenticated Users to Delete Resumes

```sql
Policy Name: Authenticated users can delete resumes
Allowed operation: DELETE
Target roles: authenticated

Policy definition:
(
  auth.role() = 'authenticated'
)
```

**Quick Setup:**
- Click "New Policy"
- Name: `Authenticated users can delete resumes`
- Policy Command: `DELETE`
- Target roles: `authenticated`
- USING expression: `true`

### 🔒 Make the Bucket Private

After adding policies:
1. Go back to **Storage** → **resumes** bucket settings
2. Make sure **"Public bucket"** is **UNCHECKED/OFF**
3. Save changes

### ✅ Verification
- The bucket should show "Private" status
- You should see 4 policies (INSERT, SELECT, UPDATE, DELETE)
- Try accessing a resume URL while logged out - it should be denied
- Try accessing while logged in - it should work

---

## Part 3: Testing Your Security Setup

### Test 1: Candidates Table
1. **Log out** of your application
2. Try to access the Talent Pool page
3. ✅ You should be redirected to login or see no data
4. **Log in** with valid credentials
5. ✅ You should now see all candidates

### Test 2: Resumes Storage
1. **Log out** of your application
2. Try to access a resume URL directly in your browser
3. ✅ You should get an error (403 Forbidden or similar)
4. **Log in** to your application
5. Try downloading a resume
6. ✅ The download should work

---

## 🚨 Important Notes

### What This Security Does:
- ✅ Blocks anonymous/unauthenticated users from viewing candidates
- ✅ Blocks anonymous users from downloading resumes
- ✅ Allows any authenticated (logged-in) user to access everything
- ✅ Data is encrypted in transit (HTTPS)

### What This Security Does NOT Do:
- ❌ Does not restrict access by user role (all authenticated users see everything)
- ❌ Does not implement row-level permissions (e.g., recruiters only seeing their candidates)

### Future Enhancements (Optional):
If you want more granular permissions (e.g., recruiters only see their own candidates):

```sql
-- Example: Users can only see candidates they created
CREATE POLICY "Users see own candidates"
  ON candidates
  FOR SELECT
  TO authenticated
  USING (
    created_by_recruiter = auth.jwt() ->> 'email'
  );
```

---

## Rollback Instructions (Emergency)

If something goes wrong and you need to restore public access temporarily:

### Rollback Candidates Table:
```sql
-- Remove all policies
DROP POLICY IF EXISTS "Authenticated users can view candidates" ON candidates;
DROP POLICY IF EXISTS "Authenticated users can insert candidates" ON candidates;
DROP POLICY IF EXISTS "Authenticated users can update candidates" ON candidates;
DROP POLICY IF EXISTS "Authenticated users can delete candidates" ON candidates;

-- Disable RLS
ALTER TABLE candidates DISABLE ROW LEVEL SECURITY;
```

### Rollback Storage Bucket:
1. Go to Storage → resumes bucket → Policies
2. Delete all policies
3. Check "Public bucket" to make it public again

---

## Support

If you encounter any issues:
1. Check Supabase logs: Dashboard → Logs
2. Check browser console for errors
3. Verify you're logged in with a valid session
4. Ensure the policies were created correctly

---

## Summary

✅ **Candidates Table**: Now requires authentication (login + password)
✅ **Resumes Bucket**: Now requires authentication (login + password)
✅ **Your data is secure**: Only logged-in users can access

No impact on your live application functionality - your authenticated users will continue to work exactly as before!
