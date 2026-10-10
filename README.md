# Brief App (Pilot v1)
A static page that shows Max's morning brief as cards. The page itself contains no brief content. The brief and taps live in the owner's Dropbox App folder.

- Brief in: `/Apps/BriefApp/brief-YYYY-MM-DD.json`
- Taps out: `/Apps/BriefApp/taps-YYYY-MM-DD.json`
- Demo Mode loads `demo/brief-demo.json` (fake, neutral sample items only).

Setup: create a Dropbox app with "App folder" access named BriefApp, give it the files.content.read and files.content.write permissions, add the page URL as a redirect URI, and put its App key in `config.js`. The app uses PKCE, so no app secret is needed.
