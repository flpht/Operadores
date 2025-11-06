// static/js/shifts.js
const USE_API_OPERADORES = true;  // <— ACTIVADO

// --- offset visual (opcional) ---
document.addEventListener('DOMContentLoaded', () => {
  const root = document.documentElement;
  const anchor = document.getElementById('turnos-anchor');
  function setTop() {
    const top = anchor ? Math.ceil(anchor.getBoundingClientRect().bottom) : 0;
    root.style.setProperty('--app-top', `${Math.max(0, top - 12)}px`);
  }
  setTop(); window.addEventListener('resize', setTop); setTimeout(setTop, 150);
});

// utils
const $  = (sel, ctx=document) => ctx.querySelector(sel);
const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));

function slugArea(name){
  return (name||'').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/\s+/g,'-').replace(/[^a-z0-9\-]/g,'');
}

function groupBy(arr, key){ return arr.reduce((a,x)=>((a[key(x)] ||= []).push(x),a),{}); }

// ---------- Construcción de columnas / slots (si usas módulos de áreas) ----------
function buildShiftColumn(colEl, items){
  const container = colEl?.querySelector?.('.shift-container');
  if(!container) return;
  container.innerHTML = '';
  const byGroup = groupBy(items, it => it.grupo || '');
  Object.entries(byGroup).forEach(([grupo, puestos])=>{
    if (grupo){
      const h = document.createElement('div');
      h.className = 'slot-header';
      h.textContent = grupo;
      container.appendChild(h);
    }
    puestos.forEach(p=>{
      const sec   = document.createElement('div'); sec.className = 'slot-section';
      const title = document.createElement('div'); title.className = 'slot-title';
      title.innerHTML = `<span>${p.puesto}</span><span class="slot-cap">0/${p.cap}</span>`;

      const slot = document.createElement('div');
      slot.className = 'slot';
      slot.dataset.capacity = p.cap;                       // capacidad para contadores
      slot.dataset.area     = p.key || slugArea(p.puesto); // clave de sección

      const ul = document.createElement('ul');
      ul.className = 'shift-drop';
      slot.appendChild(ul);

      sec.appendChild(title);
      sec.appendChild(slot);
      container.appendChild(sec);
    });
  });
}

async function renderTemplateForArea(areaName){
  const base = document.getElementById('areas-base')?.dataset?.base || '/static/js/areas';
  const fileMap = { extrusion:'extrusion.js', mezclado:'mezclado.js', laminado:'laminado.js', impresion:'impresion.js', sellado:'sellado.js', corte:'corte.js' };
  const slug = slugArea(areaName);
  const file = fileMap[slug] || `${slug}.js`;
  const url = `${base}/${file}?v=${Date.now()}`;

  try {
    const mod = await import(/* @vite-ignore */ url);
    if (typeof mod.default !== 'function') return;
    const tpl = await mod.default();

    const grid = document.querySelector('.shifts-grid');
    buildShiftColumn(grid.querySelector('.shift-col[data-shift="1"]'), tpl['1']||[]);
    buildShiftColumn(grid.querySelector('.shift-col[data-shift="2"]'), tpl['2']||[]);
    buildShiftColumn(grid.querySelector('.shift-col[data-shift="3"]'), tpl['3']||[]);
    wireDropZones();
    refreshCounts();
  } catch (e) {
    console.error('[turnos] error importando', url, e);
  }
}

// ---------- Sidebar (render lista) ----------
function renderOperatorsList(list) {
  const ul = $('#opList');
  if (!ul) return;
  ul.innerHTML = '';
  if (!list.length) {
    const li = document.createElement('li');
    li.className = 'operators-list-empty';
    li.textContent = 'No hay operadores para esta área.';
    ul.appendChild(li);
    return;
  }

  list.forEach(op => {
    const li = document.createElement('li');
    li.className = 'operator-item';
    li.draggable = true;
    li.dataset.opId = op.id;
    li.dataset.name = op.name;
    li.dataset.role = op.role;

    li.innerHTML = `
      <div class="op-info">
        <div class="op-name">${op.name}</div>
        <div class="op-role">${op.role || ''}</div>
      </div>
      <span class="op-handle">⋮⋮</span>
    `;

    li.addEventListener('dragstart', (ev) => {
      ev.dataTransfer.effectAllowed = 'move';
      ev.dataTransfer.setData('application/json', JSON.stringify({
        type: 'operator',
        opId: op.id,
        name: op.name,
        role: op.role || ''
      }));
    });

    ul.appendChild(li);
  });
}

// ---------- Carga por API ----------
async function loadOperatorsForArea(area){
  // Si no se usa API, no tocar la lista (permitimos mock o server-side inyección)
  if (!USE_API_OPERADORES) return;

  const ul = $('#opList');
  if (ul) ul.innerHTML = '<li class="operators-list-empty">Cargando…</li>';

  try {
    const res = await fetch(`/api/operadores?area=${encodeURIComponent(area)}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const items = (data.items || []).map(r => ({
      id: Number(r.CodigoID),
      name: String(r.Nombre || '').toUpperCase(),
      role: r.Rol || 'Operador'
    }));
    renderOperatorsList(items);
  } catch (err) {
    console.error('Error cargando operadores:', err);
    renderOperatorsList([]);
  }
}

// ---------- Drag & Drop ----------
function makeCard({ opId, name, role }) {
  const li = document.createElement('li');
  li.className = 'card';
  li.draggable = true;
  li.dataset.opId = opId;

  li.innerHTML = `
    <div>
      <strong>${name}</strong>
      <div class="meta">${role || ''}</div>
    </div>
    <div class="actions">
      <button title="Quitar">✖</button>
    </div>
  `;

  li.querySelector('button')?.addEventListener('click', (e) => {
    const card = e.currentTarget.closest('.card');
    const parent = card?.parentElement;
    if (parent) { parent.removeChild(card); refreshCounts(); }
  });

  li.addEventListener('dragstart', (ev) => {
    ev.dataTransfer.effectAllowed = 'move';
    ev.dataTransfer.setData('application/json', JSON.stringify({ type: 'card', opId: li.dataset.opId }));
    requestAnimationFrame(() => li.classList.add('dragging'));
  });
  li.addEventListener('dragend', () => li.classList.remove('dragging'));

  return li;
}

function refreshCounts() {
  $$('.slot-section').forEach(section => {
    const slot = $('.slot', section);
    const cap  = Number(slot?.dataset.capacity || 0);
    const list = slot?.querySelector('ul') || slot;
    const count = $$('.card', list).length;
    const capSpan = $('.slot-cap', section);
    if (capSpan) capSpan.textContent = `${count}/${cap}`;
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
    if (cap && current >= cap) {
      blinkRefuse(targetSlot);
      return false;
    }
  }

  if (payload.type === 'operator') {
    const card = makeCard(payload);
    const list = targetSlot.querySelector('ul') || targetSlot;
    list.appendChild(card);
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
  setTimeout(() => {
    node.classList.remove('drag-over');
    node.style.borderColor = '';
    node.style.background = '';
  }, 350);
}

function wireDropZones() {
  $$('.slot').forEach(slot => {
    ['dragenter','dragover'].forEach(evt =>
      slot.addEventListener(evt, e => { e.preventDefault(); slot.classList.add('drag-over'); })
    );
    ['dragleave','drop'].forEach(evt =>
      slot.addEventListener(evt, () => slot.classList.remove('drag-over'))
    );
    slot.addEventListener('drop', e => {
      e.preventDefault();
      const payload = safePayload(e.dataTransfer);
      tryAppendCard(slot, payload);
    });
  });

  $$('.absence-drop').forEach(ul => {
    ['dragenter','dragover'].forEach(evt =>
      ul.addEventListener(evt, e => { e.preventDefault(); ul.classList.add('drag-over'); })
    );
    ['dragleave','drop'].forEach(evt =>
      ul.addEventListener(evt, () => ul.classList.remove('drag-over'))
    );
    ul.addEventListener('drop', e => {
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

// ---------- Buscador / fecha / limpiar ----------
function wireSearch() {
  const input = $('#opSearch');
  if (!input) return;
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    const all = $$('#opList .operator-item');
    all.forEach(li => {
      const text = (li.dataset.name + ' ' + li.dataset.role).toLowerCase();
      li.style.display = text.includes(q) ? '' : 'none';
    });
  });
}

function wireDate() {
  const dp = $('#datePicker');
  if (!dp) return;
  const last = localStorage.getItem('turnos_date');
  if (last) dp.value = last;
  dp.addEventListener('change', () => {
    localStorage.setItem('turnos_date', dp.value || '');
  });
}

function wireClear() {
  const btn = $('#clearDay');
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (!confirm('¿Vaciar todas las asignaciones del día?')) return;
    $$('.slot, .absence-drop').forEach(node => {
      const ul = node.querySelector('ul');
      if (ul) ul.innerHTML = ''; else node.innerHTML = '';
    });
    refreshCounts();
  });
}

// ---------- Init ----------
document.addEventListener('DOMContentLoaded', () => {
  // 1) Detecta el área activa que marcó el servidor en el tab
  const activeTab = document.querySelector('#areaTabs .active');
  const activeArea = activeTab?.dataset?.area || activeTab?.textContent?.trim() || '';

  // 2) (Opcional) si usas plantillas JS por área:
  if (activeArea) renderTemplateForArea(activeArea);

  // 3) Cargar operadores por área vía API
  if (activeArea) loadOperatorsForArea(activeArea);

  // 4) UI estática
  wireDropZones();
  wireSearch();
  wireDate();
  wireClear();
  refreshCounts();
});
