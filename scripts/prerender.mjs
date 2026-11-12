// Pre-renderiza el radar en index.html para que Google y las previews de WhatsApp/LinkedIn
// vean las novedades y las fuentes sin ejecutar JavaScript. Lo corre el workflow prerender.yml
// cada vez que cambia news.json. Genera el mismo HTML que renderNews() en el navegador.
import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('..', import.meta.url);
const htmlPath = new URL('index.html', root);
let html = readFileSync(htmlPath, 'utf8');
const news = JSON.parse(readFileSync(new URL('news.json', root), 'utf8'));
if (!news || !Array.isArray(news.items) || !news.items.length) {
  console.log('news.json vacío: se mantiene lo último pre-renderizado');
  process.exit(0);
}

const m = html.match(/\/\*SOURCES_START\*\/([\s\S]*?)\/\*SOURCES_END\*\//);
const SOURCES = new Function('return ' + m[1])();
// Mismo subrayado de frases clave que usa el navegador (bloque KW en index.html)
const k = html.match(/\/\*KW_START\*\/([\s\S]*?)\/\*KW_END\*\//);
const hl = new Function('return ' + k[1])();

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fdate = s => { const [y, mo, d] = String(s).split('-'); return d && mo ? `${+d} ${MESES[+mo - 1]} ${y}` : s; };
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const safeUrl = u => /^https:\/\//.test(u || '') ? u : '#';

// Igual que en el navegador: las noticias de 10 días o más no se muestran (hora Argentina)
const hoyAR = Date.parse(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }) + 'T00:00:00Z');
const fresh = news.items.filter(n => { const t = Date.parse(String(n.fecha) + 'T00:00:00Z'); return isNaN(t) || (hoyAR - t) / 864e5 < 10; });
// Temas, urgencia e impacto (bloque META) y tarjeta (bloque CARD): el mismo código que corre en el navegador
const mm = html.match(/\/\*META_START\*\/([\s\S]*?)\/\*META_END\*\//);
const META = new Function('return ' + mm[1])();
const cm = html.match(/\/\*CARD_START\*\/([\s\S]*?)\/\*CARD_END\*\//);
const CARD = new Function('return ' + cm[1])();
const counts = {};
fresh.forEach(n => { const c = META.cat(n); counts[c] = (counts[c] || 0) + 1; });
const filters = ['Todas', ...META.CATS].map(c => `<button class="fpill" data-c="${esc(c)}" aria-pressed="${c === 'Todas'}"${c !== 'Todas' && !counts[c] ? ' data-empty' : ''}>${esc(c)}${c !== 'Todas' ? ` <small>${counts[c] || 0}</small>` : ''}</button>`).join('');
const list = [...fresh].sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
const U = { esc, fdate, safeUrl, hl, META };
const items = list.map((n, i) => CARD(n, i === 0, U)).join('');
const sources = SOURCES.map(([n, d, u]) => `<a class="src" href="${u}" target="_blank" rel="noopener"><b>${n}</b><span>${d}</span><em>${u.replace('https://', '').replace(/\/$/, '')}</em></a>`).join('');

const slot = (name, content) => {
  const re = new RegExp(`<!--PR:${name}-->[\\s\\S]*?<!--/PR:${name}-->`);
  if (!re.test(html)) throw new Error('Falta el marcador ' + name);
  html = html.replace(re, () => `<!--PR:${name}-->${content}<!--/PR:${name}-->`);
};
slot('ncount', String(fresh.length));
slot('nsrcs', String(SOURCES.length));
slot('nupd', news.actualizado ? 'Actualizado el ' + fdate(news.actualizado) : 'Radar de comex');
slot('hupd', news.actualizado ? 'Radar · ' + fdate(news.actualizado) : 'Radar');
slot('nfilter', filters);
slot('news', items);
slot('sources', sources);

// Copia de respaldo que usa el navegador si news.json no responde
const fallback = JSON.stringify(news).replace(/<\//g, '<\\/');
html = html.replace(/\/\*NEWS_FALLBACK_START\*\/[\s\S]*?\/\*NEWS_FALLBACK_END\*\//, () => `/*NEWS_FALLBACK_START*/${fallback}/*NEWS_FALLBACK_END*/`);

writeFileSync(htmlPath, html);
console.log(`Radar pre-renderizado: ${news.items.length} novedades, ${SOURCES.length} fuentes`);
