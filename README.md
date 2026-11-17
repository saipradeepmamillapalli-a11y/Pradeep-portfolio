# Mamillapalli Sai Pradeep: Portfolio

A static, single-page portfolio for GitHub Pages, with a "Test your knowledge" Kali challenge. No build step. Plain HTML, CSS and JavaScript, with GSAP and Lenis loaded from CDNs for the 3D scroll motion.

## Files

| File | Purpose |
|---|---|
| index.html | The portfolio, the hidden phone form and the Test your knowledge button |
| style.css | Hacker blue theme, layout, side rail, back-to-top, print styles |
| script.js | Hero intro, side rail, back-to-top, copy buttons, Guntur time, scroll 3D |
| challenge.js | Checks the flag and reveals the phone number (also used by the Kali page) |
| challenge.css | Styles for the flag form and the challenge section |
| features.js | Colour dots, command palette (/ or Ctrl+K), availability countdown, scan-line sweep |
| features.css | Styles for the colour dots, glitch effect, palette, badge wall, packet-flow diagram, future-role ID card and calm mode |
| idcard.js | The ID card: rotates through roles, role buttons, `?role=` links |
| visitor.js | Calm mode (remembered per visitor) and the "Copy my summary" button |
| kali.html | The Kali machine page: terminal, 5 minute timer, win and lose panels |
| kali.js | Kali machine: virtual files, hints folder, commands, timer, win check |
| kali.css | Styles for the Kali machine page |
| preloader.css, preloader.js | Intro animation (cracked display) |
| photo.jpg | Profile photo in the ID card |
| boot-photo.jpg | Photo that appears on the boot screen as the display is repaired |
| resume.pdf | Linked from the hero and Contact |
| README.md | This file |

## Put it live on GitHub Pages

1. Create a public repository named `pradeep-portfolio`.
2. Upload every file above to the repository root.
3. Settings, then Pages. Deploy from a branch: `main`, folder `/ (root)`. Save.
4. The site is at https://YOUR-GITHUB-USERNAME.github.io/pradeep-portfolio/

The flag check uses the browser's crypto functions, which need https. GitHub Pages is https, so it works on the live site.

## How the challenge works

- Button: "Test your knowledge" at the bottom of the portfolio opens kali.html.
- Kali machine: 5 minutes from when the page opens (a reload keeps the same timer). The hints are in the `hints` folder inside the machine (`ls hints`, then `cat hints/01-start.txt`).
- Winner: the visitor captures the flag. A panel says "Oh not! You have caught me" and offers Copy flag.
- Loser: time runs out. The panel says "Time's up" and offers Try again.
- Contact: the phone number is hidden. Pasting the exact flag into the form reveals it.

## Change the flag

The current flag is `FLAG{mittapalli_pradeep}`. To change it:

1. In `kali.js`, change `FLAG` (the format is `FLAG{...}`).
2. In `challenge.js`, replace `FLAG_HASH` with the SHA-256 of the lowercase flag. On a computer with a terminal:
   `printf 'flag{your_text}' | sha256sum`
3. In `challenge.js`, replace `PHONE_B64` with your number encoded in base64:
   `printf '+91 XXXXXXXXXX' | base64`

## Change the future roles

1. In `idcard.js`, edit the `ROLES` list: the title, the track (Blue team, Red team or Build), the mission sentence and the colour (`rgb`, as "red, green, blue").
2. The card rotates every 6 seconds. It pauses while the mouse is over it, and it stops when a visitor picks a role.
3. "Copy link to this role" gives a link such as `...index.html?role=pentest`, which opens on that role.

## Notes

- This is a static site, so the checks run in the visitor's browser. A visitor who reads the page source can find the flag. It is a fun challenge, not a secure lock.
- Fonts (Montserrat) and CDN scripts need an internet connection.
