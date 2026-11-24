# Git Automation Rules

## 1. Foreground Execution Only
- Always execute Git commands in the foreground synchronously without launching background task loops or polling schedules.
- Ensure the Git and GitHub CLI binary directories (`C:\Users\eslam\.gemini\antigravity\scratch\mingit\cmd` and `C:\Users\eslam\.gemini\antigravity\scratch\gh-cli`) are included in the execution `$env:PATH`.

## 2. Authentication Protocol
- Always use the authenticated GitHub CLI (`gh.exe`) credential helper (`gh auth setup-git`) for all Git remote operations.
- Verify `gh auth status` before initiating any push operations.

## 3. Post-Push Verification Mandate
- Immediately after any `git push`, run:
  ```powershell
  git fetch origin
  git log origin/main -n 1 --oneline
  ```
- Explicitly confirm and report that the head commit hash on `origin/main` matches the expected local commit hash.
- Confirm HTTP accessibility of the production deployment endpoint (`https://the-newest.vercel.app`).
