document.addEventListener('DOMContentLoaded', () => {
  // ---------- Estado / storage ----------
  const AREAS = ["Extrusión","Mezclado","Laminado","Impresión","Sellado","Corte"];
  const key = (date, area) => `turnos:${date}:${area}`;
  const kOps = "turnos:operadores";

  const getDateISO = () => {
    const el = document.getElementById('datePicker');
    if (el.value) return el.value;
    const d = new Date(), y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), da=String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${da}`;
  };

  const loadDay = (date, area) => JSON.parse(localStorage.getItem(key(date, area)) || '{"1":[],"2":[],"3":[]}');
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

  // ---------- Render ----------
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

  function renderShifts() {
    const data = loadDay(getDateISO(), currentArea); // {1:[],2:[],3:[]}
    document.querySelectorAll('.shift-drop').forEach(ul => {
      const s = ul.dataset.shift;
      ul.innerHTML = "";
      (data[s] || []).forEach(item => {
        const li = document.createElement('li');
        li.className = "card";
        li.draggable = true;
        li.dataset.assignedId = item.id;
        const op = operators.find(x => x.id === item.opId);
        li.innerHTML = `
          <div>
            <div>${op ? op.name : '—'}</div>
            <div class="meta">${op ? op.role : ''}</div>
          </div>
          <div class="actions">
            <button class="btn-outline" data-act="move" type="button" title="Mover">⇄</button>
            <button class="btn-outline" data-act="del" type="button" title="Quitar">✕</button>
          </div>`;
        li.addEventListener('dragstart', ev => {
          ev.dataTransfer.setData('text/plain', JSON.stringify({type:'assigned', id:item.id, from:s}));
        });
        // acciones
        li.querySelectorAll('button').forEach(b=>{
          b.addEventListener('click', ()=>{
            const act = b.dataset.act;
            if (act==='del') {
              data[s] = data[s].filter(x => x.id !== item.id);
              saveDay(getDateISO(), currentArea, data);
              renderShifts();
            }
            if (act==='move') {
              const next = s==='1'?'2':(s==='2'?'3':'1');
              data[s] = data[s].filter(x => x.id !== item.id);
              data[next].push(item);
              saveDay(getDateISO(), currentArea, data);
              renderShifts();
            }
          });
        });
        ul.appendChild(li);
      });
    });
  }

  // ---------- Drag & Drop en columnas ----------
  document.querySelectorAll('.shift-drop').forEach(zone => {
    zone.addEventListener('dragover', ev => { ev.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', ev => {
      ev.preventDefault();
      zone.classList.remove('drag-over');
      const s = zone.dataset.shift;
      const payload = JSON.parse(ev.dataTransfer.getData('text/plain') || "{}");
      const data = loadDay(getDateISO(), currentArea);

      if (payload.type === 'operator') {
        data[s].push({ id: crypto.randomUUID(), opId: payload.id });
      } else if (payload.type === 'assigned') {
        if (payload.from === s) return;
        const fromArr = data[payload.from] || [];
        const item = fromArr.find(x => x.id === payload.id);
        if (!item) return;
        data[payload.from] = fromArr.filter(x => x.id !== payload.id);
        data[s].push(item);
      }
      saveDay(getDateISO(), currentArea, data);
      renderShifts();
    });
  });

  // ---------- Alta operador ----------
  addOpBtn.addEventListener('click', ()=>{
    openModal();
    opName.value = "";
    opRole.value = "Operador";
    // enfocar después de abrir para que no falle en navegadores
    setTimeout(()=>opName.focus(), 0);
  });

  opCancel.addEventListener('click', (e)=>{
    e.preventDefault();
    closeModal();
  });

  // Cerrar al clickear fuera de la tarjeta
  modal.addEventListener('click', (e)=>{
    if (e.target === modal) closeModal();
  });

  // Cerrar con Escape
  document.addEventListener('keydown', (e)=>{
    if (!modal.hidden && e.key === 'Escape') closeModal();
  });

  // Guardar
  opSave.addEventListener('click', (e)=>{
    e.preventDefault();
    const name = opName.value.trim();
    if (!name) {
      opName.focus();
      return;
    }
    let operatorsArr = operators.slice();
    operatorsArr.push({ id:crypto.randomUUID(), name, role:opRole.value });
    operators = operatorsArr;
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
    saveDay(getDateISO(), currentArea, {1:[],2:[],3:[]});
    renderShifts();
  });

  // ---------- Init ----------
  renderOperators();
  renderShifts();
});
