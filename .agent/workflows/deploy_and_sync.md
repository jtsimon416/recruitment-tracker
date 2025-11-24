---
description: Sync changes to GitHub and deploy the application
---

1. Check the current git status
   - Run `git status` to see what has changed.

2. Stage all changes
   - Run `git add .`

3. Commit changes
   - Ask the user for a commit message, or use a descriptive default like "Updates and fixes" if it's a routine sync.
   - Run `git commit -m "<message>"`

4. Push to GitHub
   - Run `git push origin master`
   - This updates the source code repository.

5. Deploy to Live Site
   - Run `npm run deploy`
   - This builds the project and pushes the build artifacts to the `gh-pages` branch.
