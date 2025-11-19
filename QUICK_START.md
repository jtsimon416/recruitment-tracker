# Role Instructions Feature - Quick Start Guide

## 🚀 Get This Feature Running in 15 Minutes

This is the **fastest path** to get the Role Instructions feature deployed and tested.

---

## ⚡ 3-Step Deployment

### STEP 1: Database Setup (5 minutes)

1. Open Supabase Dashboard → SQL Editor
2. Copy this entire query and run it:

```sql
-- Add Role Instructions columns
ALTER TABLE positions
ADD COLUMN IF NOT EXISTS role_instructions_url TEXT,
ADD COLUMN IF NOT EXISTS role_instructions_uploaded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS role_instructions_viewed_by JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS role_instructions_notes TEXT;

-- Add index
CREATE INDEX IF NOT EXISTS idx_positions_role_instructions
ON positions(role_instructions_url)
WHERE role_instructions_url IS NOT NULL;
```

3. Click **RUN** - you should see "Success. No rows returned"

---

### STEP 2: Storage Setup (5 minutes)

1. Supabase Dashboard → **Storage** → **New bucket**
2. Enter:
   - Name: `role-instructions`
   - Public bucket: ✅ **CHECK THIS BOX**
3. Click **Create bucket**
4. Click on the bucket → **Policies** → **New Policy** → **Custom**
5. Paste these 3 policies:

```sql
-- Policy 1: Uploads
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'role-instructions');

-- Policy 2: Reads
CREATE POLICY "Allow public reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'role-instructions');

-- Policy 3: Deletes
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'role-instructions');
```

6. Click **Review** → **Save policy** for each one

---

### STEP 3: Deploy Code (5 minutes)

**The code is already written!** Just deploy:

```bash
# Commit changes
git add .
git commit -m "Add Role Instructions feature"
git push

# Or if deploying manually
npm run build
```

**Files that were modified:**
- ✅ [src/pages/StrategyManager.js](src/pages/StrategyManager.js)
- ✅ [src/pages/RecruiterOutreach.js](src/pages/RecruiterOutreach.js)
- ✅ [supabase/migrations/add_role_instructions_columns.sql](supabase/migrations/add_role_instructions_columns.sql)

**No new dependencies needed** - uses existing packages!

---

## ✅ 2-Minute Test

### Test as Manager:
1. Login as a manager account
2. Navigate to **Strategy Manager**
3. Click **"Role Instructions"** tab (NEW!)
4. Find any open position
5. Upload a test .docx file
6. See "✅ Role instructions uploaded!"

### Test as Recruiter:
1. Login as a recruiter assigned to that position
2. Navigate to **Recruiter Outreach**
3. Look at **"MY ACTIVE ROLES"** section
4. See rose gold box with **"🔔 NEW INSTRUCTIONS AVAILABLE!"**
5. Click **"View Instructions"**
6. Document opens in new tab
7. Refresh page - badge disappears!

**If these 7 steps work → You're done! ✅**

---

## 🎯 What You Just Built

Managers can now:
- Upload kickoff notes for ANY position
- At ANY time (before/during/after sprint)
- Track who has viewed them
- Remove/replace as needed

Recruiters will:
- See instructions on their dashboard
- Get a "NEW" badge for unviewed docs
- Click once to view
- Badge auto-disappears after viewing

---

## 🆘 Quick Troubleshooting

### "Error uploading file"
→ Did you make the bucket **PUBLIC** in Step 2? That's the most common issue.

### "Can't see Role Instructions tab"
→ Are you logged in as a Manager/Director? Recruiters don't see this tab.

### "Badge doesn't disappear"
→ Refresh the page after clicking "View Instructions"

### "File won't upload"
→ Check file format (.docx or .doc only) and size (under 10 MB)

---

## 📚 Full Documentation

For complete details, see:
- [ROLE_INSTRUCTIONS_DEPLOYMENT.md](ROLE_INSTRUCTIONS_DEPLOYMENT.md) - Complete deployment guide
- [ROLE_INSTRUCTIONS_USER_GUIDE.md](ROLE_INSTRUCTIONS_USER_GUIDE.md) - User documentation
- [ROLE_INSTRUCTIONS_SUMMARY.md](ROLE_INSTRUCTIONS_SUMMARY.md) - Technical summary

---

## 🔄 Rollback (If Needed)

If something goes wrong, run this in SQL Editor:

```sql
-- Remove columns
ALTER TABLE positions
DROP COLUMN IF EXISTS role_instructions_url,
DROP COLUMN IF EXISTS role_instructions_uploaded_at,
DROP COLUMN IF EXISTS role_instructions_viewed_by,
DROP COLUMN IF EXISTS role_instructions_notes;

DROP INDEX IF EXISTS idx_positions_role_instructions;
```

Then delete the `role-instructions` bucket in Storage.

---

## ✨ That's It!

You now have a production-ready feature that allows managers to provide early guidance to recruiters for any position, at any time.

**Total Time:** ~15 minutes
**Difficulty:** Easy
**Risk:** Low (no breaking changes)

---

**Questions?** Check the full documentation files listed above.

**Ready to deploy?** Follow the 3 steps at the top of this guide!

---

**Last Updated:** January 19, 2025
