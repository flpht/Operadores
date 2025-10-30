// static/js/operadores.js

// Espero a que la página cargue completamente para ejecutar mi código
document.addEventListener("DOMContentLoaded", function() {
    
    // --- 1. LÓGICA DE BÚSQUEDA (Mi código) ---
    const searchInput = document.getElementById("search-input");
    if (searchInput) {
        // Le digo que llame a mi función 'filtrarTabla' cada vez que suelto una tecla
        searchInput.addEventListener("keyup", filtrarTabla);
    }

    // --- 2. LÓGICA PARA MOSTRAR/OCULTAR PANELES (Mi código) ---
    // Busco mis botones y paneles por su ID
    const btnList = document.getElementById("btn-show-list");
    const btnAdd = document.getElementById("btn-show-add");
    const directoryPanel = document.getElementById("directory-panel");
    const formPanel = document.getElementById("form-panel");

    // Mi función para mostrar solo la lista
    function showListPanel() {
        if (formPanel) formPanel.style.display = "none";    // Oculto el formulario
        if (directoryPanel) directoryPanel.style.flex = "1";     // Hago que la lista ocupe todo
        if (btnList) btnList.classList.add("active");     // Activo el botón "Listar"
        if (btnAdd) btnAdd.classList.remove("active");   // Desactivo el botón "Agregar"
    }

    // Mi función para mostrar la lista y el formulario
    function showAddPanel() {
        if (formPanel) formPanel.style.display = "block";   // Muestro el formulario
        if (directoryPanel) directoryPanel.style.flex = "3";     // Hago que la lista ocupe 3/4
        if (btnList) btnList.classList.remove("active");  // Desactivo "Listar"
        if (btnAdd) btnAdd.classList.add("active");    // Activo "Agregar"
    }

    // Asigno los eventos de clic a mis botones
    if (btnList && btnAdd && directoryPanel && formPanel) {
        btnList.addEventListener("click", function(e) {
            e.preventDefault(); // Evito que el link '#' mueva la página
            showListPanel();
        });

        btnAdd.addEventListener("click", function(e) {
            e.preventDefault();
            showAddPanel();
        });
    }

    // --- 3. ¡MI LÓGICA PARA CASCADING DROPDOWNS! ---
    // (Este es el código que necesitaba para arreglar el error del dropdown)
    const areasDataElement = document.getElementById('areas-data');
    if (areasDataElement) {
        try {
            // Aquí leo los datos JSON que pasé desde mi HTML (Django)
            const areasData = JSON.parse(areasDataElement.textContent);

            const areaSelect = document.getElementById('select-area');
            const maquinaSelect = document.getElementById('select-maquina');
            // 'id_CentroCosto' es el ID que Django le da a mi campo oculto
            const hiddenCentroCostoInput = document.getElementById('id_CentroCosto'); 

            if (areaSelect && maquinaSelect && hiddenCentroCostoInput) {
                // Mi listener para el dropdown de Áreas
                areaSelect.addEventListener('change', function() {
                    const selectedArea = this.value;
                    
                    // Limpio el dropdown de máquinas
                    maquinaSelect.innerHTML = '<option value="">-- Seleccione máquina --</option>';
                    hiddenCentroCostoInput.value = ''; // Limpio el valor oculto
                    
                    if (selectedArea && areasData[selectedArea]) {
                        // Si elegí un área válida, habilito y lleno el dropdown
                        maquinaSelect.disabled = false;
                        
                        areasData[selectedArea].forEach(function(maquina) {
                            const option = document.createElement('option');
                            option.value = maquina.id; // El valor es el IdCentroCosto
                            option.textContent = `${maquina.maquina} (${maquina.id})`;
                            maquinaSelect.appendChild(option);
                        });
                    } else {
                        // Si no selecciono un área, lo deshabilito
                        maquinaSelect.disabled = true;
                    }
                });

                // Mi listener para el dropdown de Máquinas
                maquinaSelect.addEventListener('change', function() {
                    // Pongo el IdCentroCosto seleccionado en mi campo oculto
                    hiddenCentroCostoInput.value = this.value;
                });
            }
        } catch (e) {
            console.error("Tuve un error al leer los datos JSON de las áreas:", e);
        }
    }
    // --- FIN DE MI LÓGICA DE DROPDOWNS ---


    // --- 4. MI LÓGICA PARA CERRAR MENSAJES ---
    // (Esta es la lógica para los mensajes de 'Éxito' o 'Error')
    const messageContainers = document.querySelectorAll('.message');

    messageContainers.forEach(function(message) {
        // 1. Agrego el evento al botón de cerrar (X)
        const closeBtn = message.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                // Oculto el mensaje si hago clic en la X
                message.style.display = 'none';
            });
        }

        // 2. También quiero que se oculten solos después de 5 segundos
        setTimeout(function() {
            message.style.transition = 'opacity 0.5s ease-out';
            message.style.opacity = '0';
            
            // Espero a que la transición termine para quitarlo (display: none)
            setTimeout(function() {
                message.style.display = 'none';
            }, 500); // 500ms = 0.5s de la transición
            
        }, 5000); // 5000ms = 5 segundos
    });

}); // Fin de DOMContentLoaded

/**
 * Esta es mi función para filtrar la tabla (tbody) basándome en el
 * texto del input de búsqueda.
 */
function filtrarTabla() {
    let input = document.getElementById("search-input");
    if (!input) return; // Una guarda de seguridad

    let filtro = input.value.toUpperCase();
    let tablaBody = document.getElementById("tabla-body");
    if (!tablaBody) return; // Otra guarda de seguridad

    let filas = tablaBody.getElementsByTagName("tr");

    for (let i = 0; i < filas.length; i++) {
        let fila = filas[i];
        
        if (fila.getElementsByTagName("td").length === 0) continue;
        
        let celdas = fila.getElementsByTagName("td");
        let mostrarFila = false;
        
        // Empiezo en j=0 para buscar en todas las columnas
        for (let j = 0; j < celdas.length; j++) {
            if (celdas[j]) {
                if (celdas[j].textContent.toUpperCase().indexOf(filtro) > -1) {
                    mostrarFila = true;
                    break;
                }
            }
        }

        if (mostrarFila) {
            fila.style.display = "";
        } else {
            fila.style.display = "none";
        }
    }
}