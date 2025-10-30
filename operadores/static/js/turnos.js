document.addEventListener('DOMContentLoaded', () => {
  // ---------- Plantillas de puestos por área ----------
  // Cada sección tiene "positions": [{name, capacity}]
  const ROLE_TEMPLATES = {
    "Impresión": [
      { section: "Encargado de Sección", positions: [{ name: "Encargado de Sección", capacity: 1 }] },
      { section: "TINTAS", positions: [{ name: "Colorista", capacity: 3 }] },
      { section: "OPERADORES COMEXI", positions: [{ name: "Operador Comexi", capacity: 2 }] },
      { section: "OPERADORES PRIMAFLEX", positions: [{ name: "Operador Primaflex", capacity: 1 }] },
      { section: "OPERADORES FEVA 2", positions: [{ name: "Operador Feva 2", capacity: 2 }] },
      { section: "APOYO IMPRESIÓN", positions: [{ name: "Apoyo Impresión", capacity: 3 }] },
      { section: "Mecatecno (1 y 2) / Lavd. Bandejas", positions: [{ name: "Mecatecno / Lavd. Bandejas", capacity: 2 }] },
    ],
    // Otras áreas podrían definirse aquí…
  };

  const AREAS = ["Extrusión","Mezclado","Laminado","Impresión","Sellado","Corte"];

  // ---------- Storage ----------
  const key = (date, area) => `turnos:${date}:${area}`;
  const kOps = "turnos:operadores";

  const getDateISO = () => {
    const el = document.getElementById('datePicker');
    if (el.value) return el.value;
    const d = new Date(), y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), da=String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${da}`;
  };

  // Si el área tiene plantilla, estructura:
  // { "1": { "Colorista": [items], "Operador Comexi": [items], ... }, "2": {...}, "3": {...} }
  // Si NO hay plantilla: { "1":[], "2":[], "3":[] }
  const loadDay = (date, area) => {
    const raw = localStorage.getItem(key(date, area));
    if (raw) return JSON.parse(raw);
    const hasTpl = !!ROLE_TEMPLATES[area];
    if (hasTpl) {
      const base = {};
      ROLE_TEMPLATES[area].forEach(sec => sec.positions.forEach(p => base[p.name] = []));
      return { "1": structuredClone(base), "2": structuredClone(base), "3": structuredClone(base) };
    }
    return {"1":[],"2":[],"3":[]};
  };

  const saveDay = (date, area, data) => localStorage.setItem(key(date, area), JSON.stringify(data));
  const loadOps = () => JSON.parse(localStorage.getItem(kOps) || '[]');
  const saveOps = (ops) => localStorage.setItem(kOps, JSON.stringify(ops));

  // ---------- DOM refs ----------
  const tabs = document.getElementById('areaTabs');
  const datePicker = document.getElementById('datePicker');
  const clearBtn = document.getElementById('clearDay');
  const opList = document.getElementById('opList');
  const opSearch = document.getElementById('opSearch');
  const addOpBtn = document.getElementById('btnAddOperator');

  const modal = document.getElementById('opModal');
  const opName = document.getElementById('opName');
  const opRole = document.getElementById('opRole');
  const opSave = document.getElementById('opSave');
  const opCancel = document.getElementById('opCancel');

  const grid = document.querySelector('.shifts-grid');

  // ---------- Modal helpers ----------
  function openModal() {
    modal.hidden = false;
    modal.setAttribute('aria-hidden','false');
  }
  function closeModal() {
    modal.hidden = true;
    modal.setAttribute('aria-hidden','true');
  }

  // ---------- Estado UI ----------
  let currentArea = AREAS[0];
  let operators = loadOps();
  if (!operators.length) {
    operators = [
      {id:crypto.randomUUID(), name:"MARIA GARCÍA", role:"Supervisor"},
      {id:crypto.randomUUID(), name:"LUIS GARCÍA", role:"Supervisor"},
      {id:crypto.randomUUID(), name:"ANA SÁNCHEZ", role:"Ayudante"},
    ];
    saveOps(operators);
  }

  datePicker.value = getDateISO();

  // ---------- Render operadores ----------
  function renderOperators() {
    const q = (opSearch.value || "").trim().toLowerCase();
    opList.innerHTML = "";
    operators
      .filter(o => o.name.toLowerCase().includes(q))
      .forEach(o => {
        const li = document.createElement('li');
        li.className = "operator-item";
        li.draggable = true;
        li.dataset.opId = o.id;
        li.innerHTML = `
          <div>
            <div>${o.name}</div>
            <div class="operator-badge">${o.role}</div>
          </div>
          <div class="operator-handle" title="Arrastra a un turno">⋮⋮</div>`;
        li.addEventListener('dragstart', ev => {
          ev.dataTransfer.setData('text/plain', JSON.stringify({type:'operator', id:o.id}));
        });
        opList.appendChild(li);
      });
  }

  // ---------- Utilities UI ----------
  function makeCard(op, itemId, fromShift, fromPosName=null){
    const li = document.createElement('li');
    li.className = "card";
    li.draggable = true;
    li.dataset.assignedId = itemId;
    li.innerHTML = `
      <div>
        <div>${op ? op.name : '—'}</div>
        <div class="meta">${op ? op.role : ''}</div>
      </div>
      <div class="actions">
        <button class="btn-outline" data-act="del" type="button" title="Quitar">✕</button>
      </div>`;
    li.addEventListener('dragstart', ev => {
      ev.dataTransfer.setData('text/plain', JSON.stringify({
        type:'assigned',
        id:itemId,
        from: fromShift,
        fromPos: fromPosName // null si no hay plantilla
      }));
    });
    return li;
  }

  function clearNode(n){ while(n.firstChild) n.removeChild(n.firstChild); }

  // ---------- Render turnos ----------
  function renderShifts() {
    const hasTpl = !!ROLE_TEMPLATES[currentArea];
    const data = loadDay(getDateISO(), currentArea);

    // reconstruir columnas con plantilla si corresponde
    if (hasTpl) {
      // Por cada columna (1..3), construir secciones/slots
      document.querySelectorAll('.shift-col').forEach(col => {
        const shift = col.dataset.shift;
        const container = col.querySelector('.shift-container');
        clearNode(container);

        ROLE_TEMPLATES[currentArea].forEach(sec => {
          const box = document.createElement('div');
          box.className = 'slot-section';

          const head = document.createElement('div');
          head.className = 'slot-header';
          head.innerHTML = `<span>${sec.section}</span>`;
          box.appendChild(head);

          sec.positions.forEach(pos => {
            const slot = document.createElement('ul');
            slot.className = 'slot';
            slot.dataset.shift = shift;
            slot.dataset.pos = pos.name;
            slot.dataset.capacity = String(pos.capacity);

            const cap = document.createElement('div');
            cap.className = 'slot-title';
            cap.innerHTML = `${pos.name} <span class="slot-cap">${(data[shift][pos.name]||[]).length}/${pos.capacity}</span>`;
            box.appendChild(cap);
            box.appendChild(slot);

            // items
            (data[shift][pos.name] || []).forEach(item => {
              const op = operators.find(x => x.id === item.opId);
              slot.appendChild(makeCard(op, item.id, shift, pos.name));
            });

            // dnd handlers
            attachDropTo(slot);
          });

          container.appendChild(box);
        });
      });
    } else {
      // modo simple (sin plantilla)
      document.querySelectorAll('.shift-drop').forEach(ul => {
        const s = ul.dataset.shift;
        clearNode(ul);
        (data[s] || []).forEach(item => {
          const op = operators.find(x => x.id === item.opId);
          ul.appendChild(makeCard(op, item.id, s, null));
        });
      });
    }
  }

  // ---------- Drag & Drop ----------
  function attachDropTo(zone){
    zone.addEventListener('dragover', ev => { ev.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', ev => {
      ev.preventDefault();
      zone.classList.remove('drag-over');

      const payload = JSON.parse(ev.dataTransfer.getData('text/plain') || "{}");
      const date = getDateISO();
      const data = loadDay(date, currentArea);
      const s = zone.dataset.shift;

      const hasTpl = !!ROLE_TEMPLATES[currentArea];
      const posName = zone.dataset.pos || null;
      const capacity = Number(zone.dataset.capacity || Infinity);

      if (payload.type === 'operator') {
        if (hasTpl) {
          const arr = data[s][posName] || [];
          if (arr.length >= capacity) { alert(`Capacidad completa para ${posName}.`); return; }
          arr.push({ id: crypto.randomUUID(), opId: payload.id });
          data[s][posName] = arr;
        } else {
          (data[s] = data[s] || []).push({ id: crypto.randomUUID(), opId: payload.id });
        }
      } else if (payload.type === 'assigned') {
        if (hasTpl) {
          // mover entre puestos
          if (payload.from === s && payload.fromPos === posName) return;
          const fromArr = data[payload.from][payload.fromPos] || [];
          const item = fromArr.find(x => x.id === payload.id);
          if (!item) return;
          // capacidad destino
          const destArr = data[s][posName] || [];
          if (destArr.length >= capacity) { alert(`Capacidad completa para ${posName}.`); return; }
          data[payload.from][payload.fromPos] = fromArr.filter(x => x.id !== payload.id);
          destArr.push(item);
          data[s][posName] = destArr;
        } else {
          if (payload.from === s) return;
          const fromArr = data[payload.from] || [];
          const item = fromArr.find(x => x.id === payload.id);
          if (!item) return;
          data[payload.from] = fromArr.filter(x => x.id !== payload.id);
          (data[s] = data[s] || []).push(item);
        }
      }

      saveDay(date, currentArea, data);
      renderShifts();
    });
  }

  // Conecta drop a todas las zonas existentes (simple). En plantilla se llama dinámicamente.
  document.querySelectorAll('.shift-drop').forEach(attachDropTo);

  // ---------- Alta operador ----------
  addOpBtn.addEventListener('click', ()=>{
    openModal();
    opName.value = "";
    opRole.value = "Operador";
    setTimeout(()=>opName.focus(), 0);
  });

  opCancel.addEventListener('click', (e)=>{
    e.preventDefault();
    closeModal();
  });

  modal.addEventListener('click', (e)=>{
    if (e.target === modal) closeModal();
  });

  document.addEventListener('keydown', (e)=>{
    if (!modal.hidden && e.key === 'Escape') closeModal();
  });

  opSave.addEventListener('click', (e)=>{
    e.preventDefault();
    const name = opName.value.trim();
    if (!name) { opName.focus(); return; }
    operators = [...operators, { id:crypto.randomUUID(), name, role:opRole.value }];
    saveOps(operators);
    renderOperators();
    closeModal();
  });

  // ---------- Filtros / tabs / fecha ----------
  opSearch.addEventListener('input', renderOperators);

  tabs.querySelectorAll('button').forEach(b=>{
    b.addEventListener('click', ()=>{
      tabs.querySelectorAll('button').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      currentArea = b.dataset.area;
      renderShifts();
    });
  });

  datePicker.addEventListener('change', renderShifts);

  clearBtn.addEventListener('click', ()=>{
    if (!confirm('¿Limpiar asignaciones del día actual para el área seleccionada?')) return;
    const hasTpl = !!ROLE_TEMPLATES[currentArea];
    if (hasTpl) {
      const base = {};
      ROLE_TEMPLATES[currentArea].forEach(sec => sec.positions.forEach(p => base[p.name] = []));
      saveDay(getDateISO(), currentArea, { "1": structuredClone(base), "2": structuredClone(base), "3": structuredClone(base) });
    } else {
      saveDay(getDateISO(), currentArea, {1:[],2:[],3:[]});
    }
    renderShifts();
  });

  // ---------- Init ----------
  renderOperators();
  renderShifts();
});
