// static/js/shifts.js
const USE_API_OPERADORES = true; // usamos la API real

// --- offset visual (opcional) ---
document.addEventListener('DOMContentLoaded', () => {
  const root = document.documentElement;
  const anchor = document.getElementById('turnos-anchor');
  function setTop() {
    const top = anchor ? Math.ceil(anchor.getBoundingClientRect().bottom) : 0;
    root.style.setProperty('--app-top', String(Math.max(0, top - 12)) + 'px');
  }
  setTop();
  window.addEventListener('resize', setTop);
  setTimeout(setTop, 150);
});

function slugArea(name){
  return (name || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/\s+/g,'-').replace(/[^a-z0-9\-]/g,'');
}
function groupBy(arr, key){ return arr.reduce(function(a,x){ (a[key(x)] = a[key(x)] || []).push(x); return a; }, {}); }

// =============== ÁREAS / SLOTS ===============
function buildShiftColumn(colEl, items){
  const container = colEl.querySelector('.shift-container');
  if(!container) return;
  container.innerHTML = '';
  const byGroup = groupBy(items, function(it){ return it.grupo || ''; });
  Object.keys(byGroup).forEach(function(grupo){
    const puestos = byGroup[grupo];
    if (grupo){
      const h = document.createElement('div');
      h.className = 'slot-header';
      h.textContent = grupo;
      container.appendChild(h);
    }
    puestos.forEach(function(p){
      const sec = document.createElement('div'); sec.className = 'slot-section';
      const title = document.createElement('div'); title.className = 'slot-title';
      title.innerHTML = '<span>' + p.puesto + '</span><span class="slot-cap">0/' + p.cap + '</span>';
      const slot = document.createElement('div'); slot.className = 'slot';
      slot.dataset.capacity = String(p.cap);
      slot.dataset.area = p.key || slugArea(p.puesto);
      const ul = document.createElement('ul'); ul.className = 'shift-drop';
      slot.appendChild(ul);
      sec.appendChild(title);
      sec.appendChild(slot);
      container.appendChild(sec);
    });
  });
}

// Si usas módulos por área, déjalo. Si no, puedes comentar toda la función.
async function renderTemplateForArea(areaName){
  const base = (document.getElementById('areas-base') && document.getElementById('areas-base').dataset && document.getElementById('areas-base').dataset.base) || '/static/js/areas';
  const fileMap = { extrusion:'extrusion.js', mezclado:'mezclado.js', laminado:'laminado.js', impresion:'impresion.js', sellado:'sellado.js', corte:'corte.js' };
  const slug = slugArea(areaName);
  const file = fileMap[slug] || (slug + '.js');
  const url = base + '/' + file + '?v=' + Date.now();
  try{
    const mod = await import(/* @vite-ignore */ url);
    if (typeof mod.default !== 'function') throw new Error('módulo sin export default()');
    const tpl = await mod.default();
    const grid = document.querySelector('.shifts-grid');
    buildShiftColumn(grid.querySelector('.shift-col[data-shift="1"]'), tpl['1'] || []);
    buildShiftColumn(grid.querySelector('.shift-col[data-shift="2"]'), tpl['2'] || []);
    buildShiftColumn(grid.querySelector('.shift-col[data-shift="3"]'), tpl['3'] || []);
    wireDropZones();
    refreshCounts();
  }catch(e){
    console.error('[turnos] error importando', url, e);
  }
}

// =============== OPERADORES (API) ===============
function $(sel, ctx){ return (ctx || document).querySelector(sel); }
function $$(sel, ctx){ return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

function el(tag, props, children) {
  props = props || {};
  children = Array.isArray(children) ? children : (children ? [children] : []);
  const node = document.createElement(tag);
  Object.keys(props).forEach(function(k){
    var v = props[k];
    if (k === 'class') node.className = v;
    else if (k === 'dataset') Object.keys(v).forEach(function(dk){ node.dataset[dk] = v[dk]; });
    else if (k in node) node[k] = v;
    else node.setAttribute(k, v);
  });
  children.filter(Boolean).forEach(function(c){
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return node;
}

function currentTabName() {
  var active = document.querySelector('.shifts-tabs .active');
  return active ? active.textContent.trim() : '';
}

function renderOperatorsList(list) {
  const ul = $('#opList');
  ul.innerHTML = '';
  if (!list.length) {
    ul.appendChild(el('li', { class: 'operators-list-empty' }, 'No hay operadores para esta área.'));
    return;
  }
  list.forEach(function(op){
    const id = (op.CodigoID != null ? op.CodigoID : op.id);
    const nombre = (op.Nombre != null ? op.Nombre : op.name);
    const rol = (op.Rol != null ? op.Rol : (op.role || 'Operador'));
    const li = el('li', {
      class: 'operator-item',
      draggable: true,
      dataset: { opId: String(id), name: nombre, role: rol }
    }, [
      el('div', { class: 'op-info' }, [
        el('div', { class: 'op-name' }, nombre),
        el('div', { class: 'op-role' }, rol)
      ]),
      el('span', { class: 'op-handle' }, '⋮⋮')
    ]);
    li.addEventListener('dragstart', function(ev){
      ev.dataTransfer.effectAllowed = 'move';
      ev.dataTransfer.setData('application/json', JSON.stringify({
        type: 'operator', opId: String(id), name: nombre, role: rol
      }));
    });
    ul.appendChild(li);
  });
}

async function loadSidebar() {
  const area = currentTabName();
  if (!USE_API_OPERADORES || !area) { renderOperatorsList([]); return; }
  try{
    const res = await fetch('/api/operadores?area=' + encodeURIComponent(area));
    const data = await res.json();
    renderOperatorsList((data && data.items) || []);
  }catch(e){
    console.error('Error cargando operadores:', e);
    renderOperatorsList([]);
  }
}

// =============== DnD ===============
function makeCard(payload) {
  const opId = payload.opId, name = payload.name, role = payload.role;
  const card = el('li', { class: 'card', draggable: true, dataset: { opId: String(opId) } }, [
    el('div', null, [ el('strong', null, name), el('div', { class: 'meta' }, role) ]),
    el('div', { class: 'actions' }, [
      el('button', { title: 'Quitar', onclick: function(e){
        const li = e.currentTarget.closest('.card');
        const parent = li && li.parentElement;
        if (parent) { parent.removeChild(li); refreshCounts(); }
      } }, '✖')
    ])
  ]);
  card.addEventListener('dragstart', function(ev){
    ev.dataTransfer.effectAllowed = 'move';
    ev.dataTransfer.setData('application/json', JSON.stringify({ type: 'card', opId: card.dataset.opId }));
    requestAnimationFrame(function(){ card.classList.add('dragging'); });
  });
  card.addEventListener('dragend', function(){ card.classList.remove('dragging'); });
  return card;
}

function refreshCounts() {
  $$('.slot-section').forEach(function(section){
    const slot = $('.slot', section);
    const cap  = Number((slot && slot.dataset && slot.dataset.capacity) || 0);
    const list = (slot && slot.querySelector('ul')) || slot;
    const count = list ? $$('.card', list).length : 0;
    const capSpan = $('.slot-cap', section);
    if (capSpan) capSpan.textContent = String(count) + '/' + String(cap);
  });
}

function tryAppendCard(targetSlot, payload) {
  if (!targetSlot) return false;
  const isSlot = targetSlot.classList.contains('slot');
  const isAbs  = targetSlot.classList.contains('absence-drop');
  if (!isSlot && !isAbs) return false;

  if (isSlot) {
    const cap = Number(targetSlot.dataset.capacity || 0);
    const list = targetSlot.querySelector('ul') || targetSlot;
    const current = $$('.card', list).length;
    if (cap && current >= cap) { blinkRefuse(targetSlot); return false; }
  }

  if (payload.type === 'operator') {
    const card = makeCard(payload);
    (targetSlot.querySelector('ul') || targetSlot).appendChild(card);
    refreshCounts();
    return true;
  }

  if (payload.type === 'card') {
    const dragging = $('.card.dragging');
    if (dragging) {
      const list = targetSlot.querySelector('ul') || targetSlot;
      if (dragging.parentElement === list) return false;
      list.appendChild(dragging);
      refreshCounts();
      return true;
    }
  }
  return false;
}

function blinkRefuse(node) {
  node.classList.add('drag-over');
  node.style.borderColor = 'var(--color-danger)';
  node.style.background = '#ffe8ea';
  setTimeout(function(){
    node.classList.remove('drag-over');
    node.style.borderColor = '';
    node.style.background = '';
  }, 350);
}

function wireDropZones() {
  $$('.slot').forEach(function(slot){
    ['dragenter','dragover'].forEach(function(evt){
      slot.addEventListener(evt, function(e){ e.preventDefault(); slot.classList.add('drag-over'); });
    });
    ['dragleave','drop'].forEach(function(evt){
      slot.addEventListener(evt, function(){ slot.classList.remove('drag-over'); });
    });
    slot.addEventListener('drop', function(e){
      e.preventDefault();
      const payload = safePayload(e.dataTransfer);
      tryAppendCard(slot, payload);
    });
  });

  $$('.absence-drop').forEach(function(ul){
    ['dragenter','dragover'].forEach(function(evt){
      ul.addEventListener(evt, function(e){ e.preventDefault(); ul.classList.add('drag-over'); });
    });
    ['dragleave','drop'].forEach(function(evt){
      ul.addEventListener(evt, function(){ ul.classList.remove('drag-over'); });
    });
    ul.addEventListener('drop', function(e){
      e.preventDefault();
      const payload = safePayload(e.dataTransfer);
      tryAppendCard(ul, payload);
    });
  });
}

function safePayload(dt) {
  try { return JSON.parse(dt.getData('application/json') || '{}'); }
  catch { return {}; }
}

// =============== RANGO, TÍTULO Y STORAGE ===============
function pad2(n){ return String(n).padStart(2,'0'); }
function toISO(d){ return d.getFullYear() + '-' + pad2(d.getMonth()+1) + '-' + pad2(d.getDate()); }

function startOfISOWeek(d){
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7; // 1..7
  if (day > 1) date.setUTCDate(date.getUTCDate() - (day - 1));
  return date;
}
function endOfISOWeek(d){
  const s = startOfISOWeek(d);
  const e = new Date(s);
  e.setUTCDate(s.getUTCDate() + 6);
  return e;
}
function getISOWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay()||7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1)/7);
  return weekNo;
}

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function fmtRangoEs(d1, d2){
  const dia1 = d1.getUTCDate();
  const dia2 = d2.getUTCDate();
  const mes1 = MESES[d1.getUTCMonth()];
  const mes2 = MESES[d2.getUTCMonth()];
  if (d1.getUTCMonth() === d2.getUTCMonth()) return 'del ' + pad2(dia1) + ' al ' + pad2(dia2) + ' de ' + mes2;
  return 'del ' + pad2(dia1) + ' de ' + mes1 + ' al ' + pad2(dia2) + ' de ' + mes2;
}

function updateRangeTitle() {
  const from = $('#fromDate') && $('#fromDate').value;
  const to   = $('#toDate') && $('#toDate').value;
  const area = currentTabName() || 'Planta';
  const span = $('#rangeTitle');
  if (!span) return;
  if (!from || !to) { span.textContent = ''; return; }
  const dFrom = new Date(from + 'T00:00:00Z');
  const dTo   = new Date(to   + 'T00:00:00Z');
  const week  = getISOWeekNumber(dFrom);
  span.textContent = 'Turnos planta ' + area + ' — Semana N° ' + week + ' (' + fmtRangoEs(dFrom, dTo) + ')';
}

function wireDateRange() {
  const df = $('#fromDate'), dt = $('#toDate'), apply = $('#applyRange');
  if (!df || !dt || !apply) return;

  const savedFrom = localStorage.getItem('turnos_from');
  const savedTo   = localStorage.getItem('turnos_to');
  if (savedFrom && savedTo) {
    df.value = savedFrom; dt.value = savedTo;
  } else {
    const today  = new Date();
    const s = startOfISOWeek(today);
    const e = endOfISOWeek(today);
    df.value = toISO(s); dt.value = toISO(e);
  }
  updateRangeTitle();

  apply.addEventListener('click', function(){
    if (!df.value || !dt.value) return;
    localStorage.setItem('turnos_from', df.value);
    localStorage.setItem('turnos_to', dt.value);
    updateRangeTitle();
  });

  df.addEventListener('change', updateRangeTitle);
  dt.addEventListener('change', updateRangeTitle);
}

// =============== BUSCADOR & LIMPIAR ===============
function wireSearch() {
  const input = $('#opSearch');
  if (!input) return;
  input.addEventListener('input', function(){
    const q = input.value.trim().toLowerCase();
    const all = $$('#opList .operator-item');
    all.forEach(function(li){
      const text = (li.dataset.name + ' ' + li.dataset.role).toLowerCase();
      li.style.display = text.indexOf(q) !== -1 ? '' : 'none';
    });
  });
}
function wireClear() {
  const btn = $('#clearDay');
  if (!btn) return;
  btn.addEventListener('click', function(){
    if (!confirm('¿Vaciar todas las asignaciones del día/rango?')) return;
    $$('.slot').forEach(function(node){
      const ul = node.querySelector('ul');
      if (ul) ul.innerHTML = ''; else node.innerHTML = '';
    });
    $$('.absence-drop').forEach(function(ul){ ul.innerHTML = ''; });
    refreshCounts();
  });
}

// =============== SERIALIZAR ===============
function serializeAssignments() {
  const from = ($('#fromDate') && $('#fromDate').value) || null;
  const to   = ($('#toDate') && $('#toDate').value) || null;
  const week = from ? getISOWeekNumber(new Date(from + 'T00:00:00Z')) : null;

  const shifts = {};
  $$('.shift-col:not(.absences-col)').forEach(function(col){
    const shift = col.dataset.shift;
    shifts[shift] = shifts[shift] || { sections: {} };
    $$('.slot-section', col).forEach(function(section){
      const slot = $('.slot', section);
      const key  = slot.dataset.area;
      const cap  = Number(slot.dataset.capacity || 0);
      const list = slot.querySelector('ul') || slot;
      const ops  = $$('.card', list).map(function(c){ return Number(c.dataset.opId); });
      if (key) shifts[shift].sections[key] = { cap: cap, ops: ops };
    });
  });

  const absences = {};
  $$('.absence-drop').forEach(function(ul){
    const k = ul.dataset.absence;
    absences[k] = $$('.card', ul).map(function(c){ return Number(c.dataset.opId); });
  });

  return { from: from, to: to, week: week, shifts: shifts, absences: absences };
}

// =============== INIT ===============
document.addEventListener('DOMContentLoaded', function(){
  // Si usas módulos por área, puedes llamar aquí:
  // renderTemplateForArea(currentTabName());

  loadSidebar();
  wireDropZones();
  wireSearch();
  wireDateRange(); // NUEVO: rango + título
  wireClear();
  refreshCounts();
});

// ====== Exportar PDF ======
function currentAreaName() {
  const active = document.querySelector('.shifts-tabs .active');
  // Si tus tabs son <a>, toma el texto; si son <button>, igual funciona
  return active ? (active.getAttribute('data-area') || active.textContent || '').trim() : '';
}

function getCsrfToken() {
  // Toma el CSRF desde cookie (Django default)
  const name = 'csrftoken';
  const cookies = document.cookie ? document.cookie.split('; ') : [];
  for (const c of cookies) {
    const [k, v] = c.split('=');
    if (k === name) return decodeURIComponent(v);
  }
  // Si lo inyectas en un meta, úsalo:
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute('content') : '';
}

function buildOpNameMap() {
  // 1) desde las tarjetas ya creadas
  const map = {};
  document.querySelectorAll('.card').forEach(c => {
    const id = Number(c.dataset.opId);
    const nm = c.querySelector('strong')?.textContent?.trim();
    if (id && nm) map[id] = nm;
  });
  // 2) desde la lista lateral (por si hay no asignados aún)
  document.querySelectorAll('#opList .operator-item').forEach(li => {
    const id = Number(li.dataset.opId);
    const nm = li.dataset.name;
    if (id && nm && !map[id]) map[id] = nm;
  });
  return map;
}

async function exportPdf() {
  const payload = serializeAssignments();
  const area = currentAreaName();
  const fromDate = document.getElementById('fromDate')?.value || '';
  const toDate   = document.getElementById('toDate')?.value || '';
  const opsMap   = buildOpNameMap();

  const body = {
    area,
    date_from: fromDate,
    date_to: toDate,
    data: payload,
    operators: opsMap
  };

  try {
    const res = await fetch('/turnos/exportar/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken()
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error('Error exportando PDF:', txt);
      alert('No se pudo generar el PDF.');
      return;
    }

    // Descargar blob
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const fname = `turnos_${(area||'Planta')}_${(fromDate||'')}_${(toDate||'')}.pdf`.replace(/\s+/g,'_');
    a.href = url; a.download = fname;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error(e);
    alert('Error de red al generar el PDF.');
  }
}

// =============== INIT ===============
document.addEventListener('DOMContentLoaded', function(){
  // Si usas módulos por área, puedes llamar aquí:
  // renderTemplateForArea(currentTabName());

  loadSidebar();
  wireDropZones();
  wireSearch();
  wireDateRange(); // NUEVO: rango + título
  wireClear();
  refreshCounts();

  // === BLOQUE CORREGIDO ===
  const btnExport = document.getElementById('btnExportPdf');
  if (btnExport) {
    btnExport.addEventListener('click', function(e){
      e.preventDefault();
      
      // === AQUÍ ESTÁ EL CAMBIO ===
      const from = document.getElementById('fromDate')?.value || ''; // Era 'fromDate'
      const to   = document.getElementById('toDate')?.value || '';   // Era 'toDate'
      // =========================

if (!from || !to) { 
alert('Por favor, selecciona un rango de fechas (Desde y Hasta) antes de exportar.'); 
 return; 
 }
      // Llama a la función POST que YA TENÍAS definida
 exportPdf(); 
    });
  }
// ========================

});