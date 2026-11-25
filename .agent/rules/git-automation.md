# Git Automation Rules

## 1. Pre-Commit Quality & Validation Gate
- Always run and pass type-checking (`cmd /c "npx tsc --noEmit"` or `node_modules\.bin\tsc --noEmit`), any configured unit tests / validations (`npm test` / validation scripts), and production build (`npm run build`) before staging and committing changes.
- Zero TypeScript errors, lint errors, or broken builds are permitted to be committed to `main`.

## 2. Foreground Execution Only
- Always execute Git commands in the foreground synchronously without launching background task loops or polling schedules.
- Ensure the Git and GitHub CLI binary directories (`C:\Users\eslam\.gemini\antigravity\scratch\mingit\cmd` and `C:\Users\eslam\.gemini\antigravity\scratch\gh-cli`) are included in the execution `$env:PATH`.

## 3. Authentication Protocol
- Always use the authenticated GitHub CLI (`gh.exe`) credential helper (`gh auth setup-git`) for all Git remote operations.
- Verify `gh auth status` before initiating any push operations.

## 4. Post-Push Verification Mandate
- Immediately after any `git push`, run:
  ```powershell
  git fetch origin
  git log origin/main -n 1 --oneline
  ```
- Explicitly confirm and report that the head commit hash on `origin/main` matches the expected local commit hash.
- Confirm HTTP accessibility of the production deployment endpoint (`https://the-newest.vercel.app`).
