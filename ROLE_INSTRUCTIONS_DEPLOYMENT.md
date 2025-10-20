# Role Instructions Feature - Deployment Guide

## Overview
This guide walks you through deploying the new "Role Instructions" feature that allows managers to upload kickoff notes/marching orders for ANY position at ANY time during the recruitment cycle.

---

## Step 1: Run Database Migration

### Option A: Using Supabase SQL Editor (Recommended)
1. Log in to your Supabase Dashboard at [https://supabase.com](https://supabase.com)
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the contents of `supabase/migrations/add_role_instructions_columns.sql`
5. Paste into the SQL editor
6. Click **Run** to execute the migration
7. Verify success - you should see "Success. No rows returned"

### Option B: Using Supabase CLI (If you have it installed)
```bash
supabase db push
```

### Verify the Migration
Run this query in the SQL Editor to verify the columns were added:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'positions'
AND column_name LIKE 'role_instructions%';
```

You should see 4 rows:
- role_instructions_url (text)
- role_instructions_uploaded_at (timestamp with time zone)
- role_instructions_viewed_by (jsonb)
- role_instructions_notes (text)

---

## Step 2: Create Storage Bucket

1. In your Supabase Dashboard, navigate to **Storage** in the left sidebar
2. Click **New bucket**
3. Enter the following details:
   - **Name:** `role-instructions`
   - **Public bucket:** ✅ **YES** (Check this box!)
   - **File size limit:** 10 MB (or adjust as needed)
   - **Allowed MIME types:** Leave blank (will accept .docx and .doc files)
4. Click **Create bucket**

### Set Bucket Policies (Important!)
After creating the bucket, you need to set proper policies:

1. Click on the `role-instructions` bucket
2. Go to **Policies** tab
3. Click **New Policy**
4. Create the following policies:

**Policy 1: Allow authenticated uploads**
```sql
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'role-instructions');
```

**Policy 2: Allow public reads**
```sql
CREATE POLICY "Allow public reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'role-instructions');
```

**Policy 3: Allow authenticated deletes (for managers)**
```sql
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'role-instructions');
```

---

## Step 3: Deploy Code Changes

The following files have been modified:

### Modified Files:
1. ✅ `src/pages/StrategyManager.js` - Added Role Instructions tab and functionality
2. ✅ `src/pages/RecruiterOutreach.js` - Added instructions display for recruiters

### New Files Created:
1. ✅ `supabase/migrations/add_role_instructions_columns.sql` - Database migration

### No Changes Needed:
- CSS is inline and uses existing classes
- No new dependencies required
- Uses existing `strategy-documents` bucket patterns

### Deploy to Production:
```bash
# If using Git deployment (Vercel, Netlify, etc.)
git add .
git commit -m "Add Role Instructions feature"
git push

# Or rebuild your app
npm run build
```

---

## Step 4: Testing Checklist

### Manager Tests (in Strategy Manager page):
1. ✅ Navigate to Strategy Manager
2. ✅ Click on "Role Instructions" tab
3. ✅ Verify all open positions are displayed
4. ✅ Upload a .docx file for a position
5. ✅ Add optional notes during upload
6. ✅ Verify success message appears
7. ✅ Click "Preview" to view the document
8. ✅ Verify "Viewed by: 0 recruiters" appears
9. ✅ Click "Remove" and confirm deletion
10. ✅ Verify instructions are removed

### Recruiter Tests (in Recruiter Outreach page):
1. ✅ Log in as a recruiter assigned to a position
2. ✅ Navigate to Recruiter Outreach page
3. ✅ Verify position appears in "MY ACTIVE ROLES" section
4. ✅ Verify "NEW INSTRUCTIONS AVAILABLE!" badge appears
5. ✅ Verify manager notes are displayed (if provided)
6. ✅ Click "View Instructions" button
7. ✅ Verify document opens in new tab
8. ✅ Refresh page - verify badge disappears
9. ✅ Manager should see "Viewed by: 1 recruiters" in their view

### Edge Case Tests:
1. ✅ Position with no instructions (should show upload option)
2. ✅ Upload instructions before sprint starts
3. ✅ Upload instructions during active sprint
4. ✅ Upload instructions after sprint completes
5. ✅ Multiple recruiters viewing same instructions
6. ✅ Replace instructions (remove + upload new)

---

## Step 5: Verify Audit Logs

Check that audit logs are being created:

```sql
SELECT * FROM pipeline_audit_log
WHERE event_type IN ('role_instructions_uploaded', 'role_instructions_viewed', 'role_instructions_removed')
ORDER BY created_at DESC;
```

---

## Key Features Implemented

### Manager View (Strategy Manager):
- ✅ New "Role Instructions" tab added between "Strategy Documents" and "Audit Trail"
- ✅ Shows ALL open positions (not just completed sprints)
- ✅ Upload .docx/.doc files with optional notes
- ✅ Preview uploaded documents
- ✅ Remove instructions
- ✅ Track how many recruiters viewed
- ✅ Shows position status and sprint phase

### Recruiter View (Recruiter Outreach):
- ✅ Instructions appear at top of position cards
- ✅ "NEW INSTRUCTIONS AVAILABLE!" badge for unviewed instructions
- ✅ Manager notes displayed if provided
- ✅ One-click to view document
- ✅ Automatic view tracking
- ✅ Badge disappears after viewing
- ✅ Rose gold themed to match existing UI

### Backend:
- ✅ 4 new columns in positions table
- ✅ New storage bucket: `role-instructions`
- ✅ Audit logging for all actions
- ✅ JSONB array for tracking viewers
- ✅ Timestamps for upload tracking

---

## Troubleshooting

### Issue: "Error uploading file: new row violates row-level security policy"
**Solution:** Make sure you created the storage bucket policies in Step 2.

### Issue: "Cannot read properties of undefined (role_instructions_url)"
**Solution:** Make sure the database migration ran successfully. Check Step 1.

### Issue: File uploads but URL shows 404
**Solution:** Ensure the bucket is set to **Public**. Go to Storage > role-instructions > Settings > Make sure "Public bucket" is enabled.

### Issue: Recruiters don't see instructions
**Solution:**
- Verify recruiter is assigned to the position in the `pipeline` table
- Check that position status is 'Open'
- Verify instructions URL exists in database

### Issue: Badge doesn't disappear after viewing
**Solution:** Check browser console for errors. Ensure `role_instructions_viewed_by` is updating correctly in the database.

---

## Rollback Instructions (If needed)

If you need to rollback this feature:

### 1. Rollback Database Changes:
```sql
ALTER TABLE positions
DROP COLUMN IF EXISTS role_instructions_url,
DROP COLUMN IF EXISTS role_instructions_uploaded_at,
DROP COLUMN IF EXISTS role_instructions_viewed_by,
DROP COLUMN IF EXISTS role_instructions_notes;

DROP INDEX IF EXISTS idx_positions_role_instructions;
```

### 2. Delete Storage Bucket:
- Go to Supabase Dashboard > Storage
- Click on `role-instructions` bucket
- Click "Delete bucket"

### 3. Revert Code Changes:
```bash
git revert HEAD
git push
```

---

## Support

If you encounter any issues during deployment:

1. Check browser console for JavaScript errors
2. Check Supabase logs for backend errors
3. Verify all migration steps were completed
4. Ensure storage bucket is public and has correct policies
5. Test with a single position first before rolling out to all

---

## Success Criteria

The feature is successfully deployed when:

1. ✅ Managers can upload instructions for any position
2. ✅ Recruiters see instructions on their active roles
3. ✅ "NEW" badge appears until recruiter views it
4. ✅ Clicking opens document in new tab
5. ✅ View tracking works correctly
6. ✅ Audit logs are created for all actions
7. ✅ Styling matches existing rose gold theme
8. ✅ No errors in browser console
9. ✅ Mobile responsive
10. ✅ Works alongside Phase 2 Strategy without conflicts

---

**Deployment Date:** _______________
**Deployed By:** _______________
**Version:** 1.0.0

---

**END OF DEPLOYMENT GUIDE**
