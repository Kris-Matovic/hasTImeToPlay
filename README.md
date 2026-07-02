# Site starter

Plain HTML/CSS/JS. No build step, no dependencies.

## File structure
```
index.html    homepage
styles.css    all styling, including the animated line grid
script.js     the grid interaction logic
```

## Deploying to GitHub Pages

1. Create a new repo on GitHub (e.g. `your-username.github.io` if you want it
   at the root domain, or any name if you're fine with a `/repo-name/` path).
2. Push these three files to the repo's default branch:
   ```
   git init
   git add .
   git commit -m "Initial site"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
   git push -u origin main
   ```
3. On GitHub: go to the repo's **Settings → Pages**.
4. Under "Build and deployment", set **Source** to "Deploy from a branch",
   pick the `main` branch and `/ (root)` folder, then **Save**.
5. GitHub will give you a live URL, usually within a minute or two:
   - `https://YOUR-USERNAME.github.io/YOUR-REPO/`
   - or `https://YOUR-USERNAME.github.io/` if you named the repo that way.

## Custom domain (optional)
If you own a domain, add a `CNAME` file to the repo root containing just your
domain (e.g. `www.yoursite.com`), then point your domain's DNS at GitHub's
servers per GitHub's custom domain docs. Settings → Pages will show you the
exact records once you've added the file.

## Editing locally
Just open `index.html` in a browser to preview — no server needed for this
project since it's plain HTML/CSS/JS. If you add more pages, keep them as
`.html` files in this same folder and link between them normally.
