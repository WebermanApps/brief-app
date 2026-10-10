// Brief App config. Fill DROPBOX_APP_KEY after creating the Dropbox app (see README.md).
window.BRIEF_CONFIG = {
  DROPBOX_APP_KEY: "YOUR_DROPBOX_APP_KEY", // placeholder; app key is public-safe (PKCE, no secret)
  // Paths are relative to the App folder (/Apps/BriefApp in the owner's Dropbox).
  briefPath: (d) => `/brief-${d}.json`,
  tapsPath: (d) => `/taps-${d}.json`,
  demoBriefUrl: "demo/brief-demo.json"
};
