# Role Instructions Feature - User Guide

## 🎯 What is This Feature?

The **Role Instructions** feature allows managers to upload kickoff notes and marching orders for ANY position at ANY time during the recruitment cycle. This is separate from the **Phase 2 Strategy** which only applies after First Slate completion.

---

## 📊 Key Differences

| Feature | Role Instructions | Phase 2 Strategy |
|---------|------------------|------------------|
| **When to use** | Anytime (before, during, or after sprint) | Only after First Slate completes |
| **Purpose** | Early guidance, kickoff notes | Post-sprint refinement |
| **Visibility** | All recruiters on the position | Recruiters who completed sprint |
| **Location** | Strategy Manager > Role Instructions | Strategy Manager > Strategy Documents |

---

## 👔 For Managers

### How to Upload Role Instructions

1. Navigate to **Strategy Manager** from the sidebar
2. Click the **"Role Instructions"** tab
3. Find the position you want to add instructions for
4. Click **Browse** and select your .docx or .doc file
5. (Optional) Add notes to give context about the instructions
6. Click **Upload**
7. You'll see: "✅ Role instructions uploaded! Recruiters will see it on their active roles."

### What You'll See After Upload

```
┌─────────────────────────────────────────────────────────────┐
│ 🎯 Senior Developer @ TechCorp                              │
│    Status: Open | First Slate: Active Sprint                │
├─────────────────────────────────────────────────────────────┤
│ ✅ Instructions uploaded                                    │
│ 📅 Uploaded: Jan 15, 2025 3:45 PM                          │
│ 👁️ Viewed by: 3 / 5 recruiters                            │
│ 📝 Notes: "Focus on fintech background..."                 │
│                                                              │
│ [📄 Preview] [🗑️ Remove]                                  │
└─────────────────────────────────────────────────────────────┘
```

### Tracking Who Has Viewed

The system automatically tracks which recruiters have viewed your instructions:
- **"Viewed by: 0 recruiters"** - Nobody has viewed yet
- **"Viewed by: 3 / 5 recruiters"** - 3 out of 5 recruiters have viewed

### Removing Instructions

1. Find the position with uploaded instructions
2. Click **Remove** button
3. Confirm the action
4. Instructions will be removed and recruiters will no longer see them

### Replacing Instructions

To replace existing instructions:
1. Click **Remove** to delete the current file
2. Upload the new file

---

## 👥 For Recruiters

### Where to Find Instructions

1. Navigate to **Recruiter Outreach** from the sidebar
2. Look at the **"🎯 MY ACTIVE ROLES"** section at the top
3. If instructions are available, you'll see a highlighted box with:
   - 🔔 **"NEW INSTRUCTIONS AVAILABLE!"** badge (if you haven't viewed yet)
   - Manager's notes (if provided)
   - **"View Instructions"** button

### Example of What You'll See

```
┌─────────────────────────────────────────────────────────────┐
│ 🎯 Senior Developer @ TechCorp                              │
│ @ Acme Corporation                                          │
├─────────────────────────────────────────────────────────────┤
│ ╔═══════════════════════════════════════════════════════╗  │
│ ║ 🔔 NEW INSTRUCTIONS AVAILABLE!                        ║  │
│ ║                                                         ║  │
│ ║ 📄 Manager Instructions Available                     ║  │
│ ║ "Focus on candidates with fintech experience..."      ║  │
│ ║                                                         ║  │
│ ║ [📄 View Instructions]                                ║  │
│ ╚═══════════════════════════════════════════════════════╝  │
│                                                              │
│ Phase: First Slate Sprint                                   │
│ ⏰ 18h 45m 23s remaining                                    │
│ Progress: 5 / 8 candidates                                  │
└─────────────────────────────────────────────────────────────┘
```

### How to View Instructions

1. Click the **"View Instructions"** button
2. The document will open in a new browser tab
3. The **"NEW"** badge will disappear after you view it
4. You can view the instructions again anytime by clicking the button

### The Badge System

- **🔔 NEW INSTRUCTIONS AVAILABLE!** - You haven't viewed this yet
- **No badge** - You've already viewed the instructions
- The badge reappears if the manager uploads new instructions

---

## 🎨 Visual Design

The feature uses the existing rose gold theme:
- Rose gold highlights and borders
- Consistent with Phase 2 Strategy styling
- Mobile responsive
- Clean, professional appearance

---

## 📱 Mobile Support

The feature is fully mobile responsive:
- Buttons stack vertically on small screens
- Text remains readable
- Touch-friendly button sizes
- Smooth animations

---

## ⚡ Common Use Cases

### Use Case 1: New Position Kickoff
**Scenario:** Manager just opened a new position and wants to give recruiters early guidance.

**Steps:**
1. Manager uploads kickoff notes in "Role Instructions" tab
2. Adds notes: "Priority: candidates with Python + React experience"
3. Recruiters see instructions immediately on their dashboard
4. Recruiters click to read before starting outreach

---

### Use Case 2: Mid-Sprint Guidance
**Scenario:** Sprint is active, manager wants to adjust search criteria.

**Steps:**
1. Manager uploads updated instructions during active sprint
2. Adds notes: "UPDATED: Also consider candidates from healthcare tech"
3. Recruiters see "NEW INSTRUCTIONS AVAILABLE!" badge
4. Recruiters adjust their search accordingly

---

### Use Case 3: Pre-Sprint Preparation
**Scenario:** Position is open but sprint hasn't started yet.

**Steps:**
1. Manager uploads detailed role brief before sprint begins
2. Adds notes: "Review before our kickoff meeting tomorrow"
3. Recruiters review instructions in advance
4. Team is prepared when sprint officially starts

---

## 🔍 Frequently Asked Questions

### Q: Can I upload instructions before starting a First Slate sprint?
**A:** Yes! That's the whole point of this feature. Upload anytime.

### Q: What's the difference between Role Instructions and Phase 2 Strategy?
**A:** Role Instructions = early guidance (anytime). Phase 2 Strategy = post-sprint refinement (only after 8 candidates submitted).

### Q: Can I upload multiple files?
**A:** No, only one document per position. To update, remove the old one and upload a new one.

### Q: What file formats are supported?
**A:** .docx and .doc (Microsoft Word documents)

### Q: What's the file size limit?
**A:** 10 MB per file

### Q: Can recruiters download the file?
**A:** Yes, clicking "View Instructions" opens the file in a new tab where they can download it.

### Q: Will the badge come back if I view the same instructions again?
**A:** No, the badge only appears once when new instructions are first uploaded. It disappears after your first view.

### Q: What if I remove instructions by accident?
**A:** You'll need to re-upload the file. There's no undo, but you'll get a confirmation prompt before removal.

### Q: Can I see when each recruiter viewed the instructions?
**A:** Currently, you can only see the count of how many viewed, not individual timestamps. This may be added in a future update.

### Q: Do instructions carry over if I close and reopen a position?
**A:** Instructions stay with the position unless you manually remove them.

---

## 🆘 Troubleshooting

### Issue: I don't see the "Role Instructions" tab
**Solution:** Make sure you're logged in as a Director or Manager. This feature is not available to recruiters.

### Issue: Upload button doesn't work
**Solution:**
- Check file format (.docx or .doc only)
- Check file size (must be under 10 MB)
- Try refreshing the page

### Issue: Recruiter doesn't see instructions
**Solution:**
- Verify recruiter is assigned to the position
- Check that position status is "Open"
- Ask recruiter to refresh their page

### Issue: Badge doesn't disappear after viewing
**Solution:**
- Refresh the page
- Clear browser cache
- Make sure you actually clicked "View Instructions" (not just hovered)

---

## 📞 Support

If you encounter issues not covered in this guide:
1. Check the browser console for error messages (F12)
2. Try refreshing the page
3. Contact your system administrator
4. Report bugs via your internal support channel

---

## ✅ Quick Reference

### Manager Quick Steps:
1. Strategy Manager > Role Instructions tab
2. Find position > Upload file
3. Add optional notes > Upload
4. Track views > Remove when done

### Recruiter Quick Steps:
1. Recruiter Outreach > MY ACTIVE ROLES
2. Look for rose gold highlighted box
3. Click "View Instructions"
4. Badge disappears after viewing

---

**Last Updated:** January 2025
**Version:** 1.0.0

---

**END OF USER GUIDE**
