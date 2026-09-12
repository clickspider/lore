# Landing deployment

This static landing page is ready to deploy from the repository root with Vercel. No build command or framework preset is required: Vercel serves `index.html` and `landing.css` directly.

To serve it at `loreos.dev`, import the repository into Vercel, deploy with the root directory unchanged, then add `loreos.dev` in **Project Settings → Domains**. Point the domain's DNS records to the values Vercel presents. Once verified, set `loreos.dev` as the production domain.
