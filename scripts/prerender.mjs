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

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fdate = s => { const [y, mo, d] = String(s).split('-'); return d && mo ? `${+d} ${MESES[+mo - 1]} ${y}` : s; };
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const safeUrl = u => /^https:\/\//.test(u || '') ? u : '#';

const cats = ['Todas', ...new Set(news.items.map(n => n.categoria))];
const filters = cats.map(c => `<button class="fpill" data-c="${esc(c)}" aria-pressed="${c === 'Todas'}">${esc(c)}</button>`).join('');
const list = [...news.items].sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
const items = list.map((n, i) => {
  const fs = n.fuentes || []; const main = fs[0];
  return `<article class="nitem${i === 0 ? ' feat' : ''}">
    ${i === 0 ? '<span class="flag">Última novedad</span>' : ''}
    <div class="nmeta"><time datetime="${esc(n.fecha)}">${esc(fdate(n.fecha))}</time><span class="chip">${esc(n.categoria)}</span></div>
    <h4>${main ? `<a class="nlink" href="${esc(safeUrl(main.url))}" target="_blank" rel="noopener">${esc(n.titulo)}</a>` : esc(n.titulo)}</h4><p>${esc(n.resumen)}</p>
    ${n.porque ? `<p class="nwhy"><b>Por qué importa:</b> ${esc(n.porque)}</p>` : ''}
    ${main ? `<span class="ngo">Leer en ${esc(main.nombre)} <span aria-hidden="true">→</span></span>` : ''}<div class="nsrc">${fs.map(f => `<a href="${esc(safeUrl(f.url))}" target="_blank" rel="noopener">${esc(f.nombre)} <small class="${f.oficial ? '' : 'm'}">${f.oficial ? 'Oficial' : 'Medio'}</small></a>`).join('')}</div>
  </article>`;
}).join('');
const sources = SOURCES.map(([n, d, u]) => `<a class="src" href="${u}" target="_blank" rel="noopener"><b>${n}</b><span>${d}</span><em>${u.replace('https://', '').replace(/\/$/, '')}</em></a>`).join('');

const slot = (name, content) => {
  const re = new RegExp(`<!--PR:${name}-->[\\s\\S]*?<!--/PR:${name}-->`);
  if (!re.test(html)) throw new Error('Falta el marcador ' + name);
  html = html.replace(re, () => `<!--PR:${name}-->${content}<!--/PR:${name}-->`);
};
slot('ncount', String(news.items.length));
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
