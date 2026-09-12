# Get Lore into Slack — 5 tiny steps

No experience needed. Do one step, then the next. ~5 minutes.
You only ever touch the **browser** and **one file (`.env`)**. Nothing else.

---

## ✅ STEP 1 — Open the app page (pre-filled for you)

Copy-paste this into your **Terminal** and press Enter:

```bash
open "$(cat '/Users/danielfrey/conductor/workspaces/agents-everywhere-starter-kit/copenhagen/.copilotkit/artifacts/lore/slack-app-create-url.txt')"
```

A Slack page opens, already filled in with an app called **Lore**.
(If the terminal way feels weird, the same link is at the bottom of this file — just click it.)

---

## ✅ STEP 2 — Create the app

1. On that page, pick **your Slack workspace** from the dropdown.
2. Click the green **Create** button.
   - Stuck? If a **Next** button looks dead, **scroll down inside the popup** — there's a hidden box to fill.

Done = you now see a page for the **Lore** app.

---

## ✅ STEP 3 — Turn it on (this is the important click)

1. On the left menu, click **OAuth & Permissions**.
2. Near the top, click **Reinstall to Workspace**.
3. Click **Allow**.

That's the switch that gives Lore permission to read/reply. Don't skip it.

---

## ✅ STEP 4 — Copy 2 secret values into your `.env` file

Open the file: in Terminal run `open -e '/Users/danielfrey/conductor/workspaces/agents-everywhere-starter-kit/copenhagen/.env'`
(it opens in TextEdit). Scroll to the bottom and add **two new lines**:

**Value A — the Bot Token** (⚠️ copy it AFTER you did the Reinstall in Step 3)
- Still on **OAuth & Permissions**, find **Bot User OAuth Token**. It starts with `xoxb-`.
- Click **Copy**, then in `.env` add:
  ```
  INTELLIGENCE_CHANNEL_LORE_SLACK_BOT_TOKEN=xoxb-paste-it-here
  ```

**Value B — the Signing Secret**
- Left menu → **Basic Information** → scroll to **App Credentials** → **Signing Secret** → **Show** → **Copy**.
- In `.env` add:
  ```
  INTELLIGENCE_CHANNEL_LORE_SLACK_SIGNING_SECRET=paste-it-here
  ```

Save the file (Cmd+S).
🔒 Don't send me these values — they just live in `.env`.

---

## ✅ STEP 5 — Tell me "done"

That's it. Say **"done"** in the chat.
I take over: attach Slack, start Lore, confirm it's **online**, and we test a real message.

---

### Backup: the raw link (if the Terminal command didn't work)
Open `.copilotkit/artifacts/lore/slack-app-create-url.txt` and click the link inside,
or paste its contents into your browser.
