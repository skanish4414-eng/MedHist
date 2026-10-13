# MedHist static site

MedHist is a browser-only site with no backend or server database. It starts
with clearly labeled fictional report examples, chart values, specialist names,
and medicine-name placeholders. These are not real measurements, doctors, or
medicines. Any entries you add are saved in the current browser's local storage
and are not shared between visitors. File attachments are not uploaded; report
PDFs are generated in the browser.

## Run locally

From this folder, run:

```powershell
py -m http.server 8000 --bind 127.0.0.1
```

Open <http://127.0.0.1:8000/>. Local demo sign-in: `demo@example.com` /
`pass123`. The profile name is prefilled as `Sk Anisur Rahaman`.

## Render static site

Connect this GitHub repository to Render as a Blueprint and apply `render.yaml`.
Render publishes only the website files to a free static site. The dashboard
provides the public `https://...onrender.com` URL after the first deploy.

This browser-only site is not a secure medical-record system. Do not rely on it
for diagnosis, treatment, or medication decisions, and do not store sensitive
health information or real account passwords in it.
