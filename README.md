# Brief App (v2)
A static page that shows Max's morning brief as cards. The page itself contains no brief content. The brief and taps live in the owner's Dropbox App folder.

- Brief in: `/Apps/BriefApp/brief-YYYY-MM-DD.json`
- Taps out: `/Apps/BriefApp/taps-YYYY-MM-DD.json`
- Demo Mode loads `demo/brief-demo.json` (fake, neutral sample items only).

Setup: create a Dropbox app with "App folder" access named BriefApp, give it the files.content.read and files.content.write permissions, add the page URL as a redirect URI, and put its App key in `config.js`. The app uses PKCE, so no app secret is needed.

## v2: Agent Sections
Below the ranked Top Items cards, a grid of tiles: Folio, Prop, Construction, Scout, Blueprint, Coach, and Other (Dump, Thai, Health, Wellnest, Miles, Ted Talk, Japan Cottage; any unknown agent id also lands in Other). Each tile shows up to 3 highlights and a badge with the open-ask count. Tapping a tile opens `#/agent/<id>` (or `#/agent/other`) with a back button: status, open asks (Approve / Park With Date / Done / Ask Me), Recent Changes, and an optional link.

Optional brief field: `agents: [{ id, name, highlights[], asks: [{ id, title, detail }], status, recent[], link? }]`. Briefs without `agents` still work (no tiles shown). Ask taps go in the same taps file with ids prefixed by agent id, e.g. `folio:ask1`. An ask counts as open until it has any tap.

Hover motion follows `.mw-hover` from the brand tokens (180ms ease-out, slight scale/lift, links nudge), off under prefers-reduced-motion.
