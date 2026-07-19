/**
 * Builds the deployable beta site into site/ :
 *   site/app.html          — code/pitchintel-app.html + beta banner, waitlist modal,
 *                             Pro-button wiring, disclaimer footer
 *   site/how-it-works.html — copy of code/how-it-works-v2.html
 *
 * site/index.html (landing page) is authored by hand and left untouched.
 * Run `npm run build:app` first if the engine code changed.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const codeDir = join(root, 'code');
const siteDir = join(root, 'site');
mkdirSync(siteDir, { recursive: true });

const CONTACT = 'kunal@generativeducation.com';

const BETA_LAYER = `
<style>
.beta-chip{display:inline-block;margin-left:0.5rem;padding:0.1rem 0.5rem;border-radius:999px;background:var(--gold-dim);color:var(--gold);font-size:0.65rem;font-weight:800;letter-spacing:1px;vertical-align:middle}
#beta-banner{background:linear-gradient(90deg,rgba(0,180,255,0.12),rgba(255,184,0,0.10));border-bottom:1px solid var(--border);padding:0.5rem 1rem;text-align:center;font-size:0.82rem;color:var(--text)}
#beta-banner a{font-weight:600;cursor:pointer}
#beta-banner .beta-close{float:right;background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:1rem;line-height:1}
#waitlist-modal{display:none;position:fixed;inset:0;z-index:1000;background:rgba(6,8,12,0.8);backdrop-filter:blur(4px);align-items:center;justify-content:center;padding:1rem}
#waitlist-modal.open{display:flex}
.wl-box{background:var(--card);border:1px solid var(--border-light);border-radius:12px;max-width:420px;width:100%;padding:2rem;position:relative;box-shadow:0 16px 64px rgba(0,0,0,0.6)}
.wl-box h3{color:var(--text-bright);font-size:1.25rem;margin-bottom:0.5rem}
.wl-box p{color:var(--text-dim);font-size:0.9rem;margin-bottom:1.25rem}
.wl-box .wl-close{position:absolute;top:0.75rem;right:1rem;background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:1.3rem}
.wl-box input[type=email]{width:100%;padding:0.7rem 1rem;background:var(--bg2);border:1px solid var(--border);border-radius:8px;color:var(--text-bright);font-family:var(--font);font-size:0.95rem;outline:none;margin-bottom:0.75rem}
.wl-box input[type=email]:focus{border-color:var(--accent)}
.wl-box button[type=submit]{width:100%;background:var(--accent);color:#fff;border:none;padding:0.7rem;border-radius:8px;font-family:var(--font);font-weight:700;font-size:0.95rem;cursor:pointer}
.wl-box button[type=submit]:hover{opacity:0.9}
.wl-success{display:none;color:var(--green);font-weight:600;text-align:center;padding:0.5rem 0}
#beta-footer{max-width:1200px;margin:0 auto;padding:1.5rem 1rem 2.5rem;border-top:1px solid var(--border);color:var(--text-dim);font-size:0.78rem;line-height:1.7}
</style>
<div id="waitlist-modal" role="dialog" aria-modal="true">
  <div class="wl-box">
    <button class="wl-close" aria-label="Close">&times;</button>
    <h3>PitchIntel Pro is coming</h3>
    <p>Full 30-club valuations, every player, live data. Leave your email and you're first in line when Pro opens.</p>
    <form name="waitlist" method="POST" data-netlify="true" id="wl-form">
      <input type="hidden" name="form-name" value="waitlist">
      <input type="hidden" name="source" value="app-pro-modal">
      <input type="email" name="email" placeholder="you@club.com" required autocomplete="email">
      <button type="submit">Join the waitlist</button>
      <div class="wl-success">You're on the list. See you at kickoff. &#9917;</div>
    </form>
  </div>
</div>
<footer id="beta-footer">
  <strong>Beta.</strong> Valuations are illustrative, computed by the PitchIntel engine on a curated demo dataset
  (~80 players, 30 clubs, 5 leagues). Live match data integration is in progress.
  Market values are public estimates. Not affiliated with any club, league, player, or data provider.
  Questions or feedback: <a href="mailto:${CONTACT}">${CONTACT}</a>
</footer>
<script>
(function(){
  var modal=document.getElementById('waitlist-modal');
  function openModal(src){modal.classList.add('open');var s=document.querySelector('#wl-form input[name=source]');if(s&&src)s.value=src;var e=document.querySelector('#wl-form input[type=email]');if(e)setTimeout(function(){e.focus()},50);}
  function closeModal(){modal.classList.remove('open');}
  modal.querySelector('.wl-close').addEventListener('click',closeModal);
  modal.addEventListener('click',function(e){if(e.target===modal)closeModal();});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')closeModal();});
  document.addEventListener('click',function(e){
    if(e.target.closest('.lock-btn')){openModal('lock-card');e.preventDefault();}
    else if(e.target.closest('.show-all-btn')){openModal('show-all-clubs');e.preventDefault();}
    else if(e.target.closest('.beta-waitlist-link')){openModal('beta-banner');e.preventDefault();}
  });
  var form=document.getElementById('wl-form');
  form.addEventListener('submit',function(e){
    e.preventDefault();
    var data=new URLSearchParams(new FormData(form)).toString();
    fetch('/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:data})
      .catch(function(){})
      .finally(function(){
        form.querySelector('input[type=email]').style.display='none';
        form.querySelector('button[type=submit]').style.display='none';
        form.querySelector('.wl-success').style.display='block';
        setTimeout(closeModal,2200);
      });
  });
  var banner=document.createElement('div');
  banner.id='beta-banner';
  banner.innerHTML='&#9888;&#65039; Beta &mdash; running on a curated demo dataset. <a class="beta-waitlist-link">Join the waitlist</a> for live data. <button class="beta-close" aria-label="Dismiss">&times;</button>';
  banner.querySelector('.beta-close').addEventListener('click',function(){banner.remove();});
  var app=document.getElementById('app');
  app.insertBefore(banner,app.firstChild);
})();
</script>
`;

// --- app.html ---
let app = readFileSync(join(codeDir, 'pitchintel-app.html'), 'utf-8');
if (!app.includes('logo-intel">Intel</span>')) throw new Error('logo markup changed — update build-site.mjs');
app = app.replace('logo-intel">Intel</span>', 'logo-intel">Intel</span><span class="beta-chip">BETA</span>');
app = app.replace('<span>Powered by <a href="#">RuVector Graph Engine</a></span>',
                  '<span>Powered by the RuVector Graph Engine &middot; <a href="index.html">Home</a> &middot; <a href="how-it-works.html">How it works</a></span>');
app = app.replace('</body>', BETA_LAYER + '\n</body>');
if (app.includes('href="#"')) throw new Error('unhandled dead link in app — update build-site.mjs');
writeFileSync(join(siteDir, 'app.html'), app);
console.log(`site/app.html (${(app.length / 1024).toFixed(0)} KB)`);

// --- how-it-works.html --- (fix dead placeholder links from the original page)
let hiw = readFileSync(join(codeDir, 'how-it-works-v2.html'), 'utf-8');
hiw = hiw
  .replace('<div class="logo">Pitch<span>Intel</span></div>',
           '<a href="index.html" style="text-decoration:none"><div class="logo">Pitch<span>Intel</span></div></a>')
  .replace('<a href="#" style="color:var(--blue)">Try Free →</a>',
           '<a href="app.html" style="color:var(--blue)">Try Free →</a>')
  .replace('<a href="#">talk to us</a>',
           `<a href="mailto:${CONTACT}">talk to us</a> or <a href="enterprise.html">walk through the live club demo</a>`)
  .replace('<a href="#">Get in touch</a>', `<a href="mailto:${CONTACT}">Get in touch</a>`)
  .replace('<a href="#" class="cta-btn">Try PitchIntel Free →</a>',
           '<a href="app.html" class="cta-btn">Try PitchIntel Free →</a>')
  .replace(/\s*Or read the <a href="#">Substack<\/a> for weekly transfer intelligence\.\s*/,
           ' <a href="index.html#waitlist">Join the waitlist</a> for live-data updates. ')
  .replace('Built on <a href="#">RuVector</a>', 'Built on RuVector');
if (hiw.includes('href="#"')) throw new Error('unhandled dead link in how-it-works — update build-site.mjs');
writeFileSync(join(siteDir, 'how-it-works.html'), hiw);
console.log('site/how-it-works.html');

// --- worldcup.html --- (static editorial page, engine-computed at build time)
const wc = readFileSync(join(codeDir, 'pitchintel-worldcup.html'), 'utf-8');
if (wc.includes('href="#"')) throw new Error('dead link in worldcup page — update worldcup.ts');
writeFileSync(join(siteDir, 'worldcup.html'), wc);
console.log(`site/worldcup.html (${(wc.length / 1024).toFixed(0)} KB)`);

// --- enterprise.html --- (self-contained demo; carries its own banner/framing)
const ent = readFileSync(join(codeDir, 'pitchintel-enterprise.html'), 'utf-8');
if (ent.includes('href="#"')) throw new Error('dead link in enterprise demo — update enterprise.ts');
writeFileSync(join(siteDir, 'enterprise.html'), ent);
console.log(`site/enterprise.html (${(ent.length / 1024).toFixed(0)} KB)`);

console.log('Done. Landing page: site/index.html (hand-authored, not regenerated).');
