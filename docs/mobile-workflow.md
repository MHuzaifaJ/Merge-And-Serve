# Work from mobile while the PC is off

## One-time account setup

1. Open Codex on the web or desktop. Choose **Work in > Cloud > Select environment > Create environment** (or Settings > Codex Cloud > Environments).
2. Connect GitHub if prompted and select **MHuzaifaJ/Merge-And-Serve**. Use a private environment.
3. Ask setup to use Node 24, pnpm 11.25.0 and Python 3.12. Install commands:

   ```sh
   npm install --global pnpm@11.25.0
   pnpm install --frozen-lockfile
   python -m pip install -r scripts/requirements-art.txt
   ```

4. Verify with `pnpm test`, `pnpm test:assets`, `pnpm build`. For browser work run `pnpm dev -- --host 0.0.0.0` and use the environment's browser preview.
5. Review the setup and **Publish** the environment. Merely saving a draft does not make it runnable from mobile.

## Enable itch deployments

1. Obtain an itch Butler API key (source `wharf`) via `butler login` or itch API settings: https://itch.io/user/settings/api-keys. Never paste a key into a chat, source file or workflow YAML.
2. Add a repository Actions secret named **BUTLER_API_KEY** at https://github.com/MHuzaifaJ/Merge-And-Serve/settings/secrets/actions.
3. Run **Check and deploy to itch.io** on main from https://github.com/MHuzaifaJ/Merge-And-Serve/actions (or push a main commit). Tests and asset verification must pass before upload.
4. On the FIRST Butler deployment, open https://itch.io/game/edit/5317747. A new **html5** channel upload appears separately from the older manually uploaded ZIP. Enable **This file will be played in the browser** on the html5 upload; ensure the older ZIP is not the selected browser build, then save. The project kind remains HTML. Preserve portrait/mobile/fullscreen settings. Later deployments update this same channel automatically.
5. Open https://mhuzaifaj.itch.io/merge-and-serve on mobile and verify the new browser build. A green upload job alone does not prove the new channel was selected for browser play.

## Normal mobile workflow

Select the published cloud environment in Codex on mobile, then describe the requested change. Tell the agent whether to make a PR for review or push the tested change to main. PRs run checks but do not publish. Main changes automatically build and upload to itch; the computer can stay off.

Example: "Read AGENTS.md and docs/art-direction.md. [Describe my change.] Implement it, run the required checks, push to main and verify the itch deployment."

The local desktop chat does not turn into a cloud task automatically. Cloud work uses repository files, so this repo includes the locked style reference and project instructions. No itch credential needs to be stored in the cloud coding environment.

## Troubleshooting

- No environment on mobile: confirm it is published, uses the same account/workspace, and is accessible to you.
- Missing BUTLER_API_KEY error: add the repository Actions secret, then re-run the failed jobs.
- Butler authentication failure: confirm the key is valid and the itch account can publish to mhuzaifaj/merge-and-serve.
- Upload succeeds but old game plays: select the html5 channel as the browser-playable upload in the itch editor and save.
- A failed check prevents publishing. Read the Actions job logs, fix the change, and push again.

Sources: https://learn.chatgpt.com/docs/environments/cloud-environments, https://itch.io/docs/butler/login.html, https://itch.io/docs/butler/pushing.html.
