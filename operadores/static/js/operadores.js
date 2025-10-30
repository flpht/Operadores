// static/js/operadores.js

// Espera a que la página cargue completamente
document.addEventListener("DOMContentLoaded", function() {
    
    // --- 1. LÓGICA DE BÚSQUEDA ---
    const searchInput = document.getElementById("search-input");
    if (searchInput) {
        searchInput.addEventListener("keyup", filtrarTabla);
    }

    // --- 2. ¡LÓGICA MEJORADA! PARA MOSTRAR/OCULTAR PANELES ---
    const btnList = document.getElementById("btn-show-list");
    const btnAdd = document.getElementById("btn-show-add");
    const directoryPanel = document.getElementById("directory-panel");
    const formPanel = document.getElementById("form-panel");

    // Asigna los eventos a los botones
    if (btnList && btnAdd && directoryPanel && formPanel) {
        
        btnList.addEventListener("click", function(e) {
            e.preventDefault(); // Evita que el link '#' mueva la página
            
            // --- ¡CAMBIO! ---
            // Simplemente quitamos la clase 'form-active'
            directoryPanel.classList.remove("form-active");
            formPanel.classList.remove("form-active");
            
            // Actualiza los botones
            btnList.classList.add("active");
            btnAdd.classList.remove("active");
        });

        btnAdd.addEventListener("click", function(e) {
            e.preventDefault();
            
            // --- ¡CAMBIO! ---
            // Simplemente añadimos la clase 'form-active'
            directoryPanel.classList.add("form-active");
            formPanel.classList.add("form-active");
            
            // Actualiza los botones
            btnList.classList.remove("active");
            btnAdd.classList.add("active");
        });

        // --- ¡NUEVO! ---
        // Comprueba si el formulario tiene errores al cargar la página
        // (Esto es por si el guardado falla, para que el formulario siga visible)
        if (formPanel.querySelector(".error-text") || formPanel.querySelector(".form-error-list")) {
            // Si hay errores, activa el panel del formulario
            directoryPanel.classList.add("form-active");
            formPanel.classList.add("form-active");
            btnList.classList.remove("active");
            btnAdd.classList.add("active");
        }
    }
    
    // --- 3. LÓGICA PARA CASCADING DROPDOWNS ---
    const areasDataElement = document.getElementById('areas-data');
    if (areasDataElement) {
        try {
            const areasData = JSON.parse(areasDataElement.textContent);
            const areaSelect = document.getElementById('select-area');
            const maquinaSelect = document.getElementById('select-maquina');
            const hiddenCentroCostoInput = document.getElementById('id_CentroCosto'); 

            if (areaSelect && maquinaSelect && hiddenCentroCostoInput) {
                areaSelect.addEventListener('change', function() {
                    const selectedArea = this.value;
                    maquinaSelect.innerHTML = '<option value="">-- Seleccione máquina --</option>';
                    hiddenCentroCostoInput.value = '';
                    
                    if (selectedArea && areasData[selectedArea]) {
                        maquinaSelect.disabled = false;
                        areasData[selectedArea].forEach(function(maquina) {
                            const option = document.createElement('option');
                            option.value = maquina.id;
                            option.textContent = `${maquina.maquina} (${maquina.id})`;
                            maquinaSelect.appendChild(option);
                        });
                    } else {
                        maquinaSelect.disabled = true;
                    }
                });

                maquinaSelect.addEventListener('change', function() {
                    hiddenCentroCostoInput.value = this.value;
                });
            }
        } catch (e) {
            console.error("Error al parsear los datos JSON de las áreas:", e);
        }
    }

    // --- 4. LÓGICA PARA CERRAR MENSAJES ---
    const messageContainers = document.querySelectorAll('.message');
    messageContainers.forEach(function(message) {
        const closeBtn = message.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                message.style.display = 'none';
            });
        }
        setTimeout(function() {
            message.style.transition = 'opacity 0.5s ease-out';
            message.style.opacity = '0';
            setTimeout(function() {
                message.style.display = 'none';
            }, 500); 
        }, 5000); 
    });

}); // Fin de DOMContentLoaded

/**
 * Filtra las filas de la tabla (tbody) basándose en el
 * texto del input de búsqueda.
 */
function filtrarTabla() {
    let input = document.getElementById("search-input");
    if (!input) return;

    let filtro = input.value.toUpperCase();
    let tablaBody = document.getElementById("tabla-body");
    if (!tablaBody) return;

    let filas = tablaBody.getElementsByTagName("tr");

    for (let i = 0; i < filas.length; i++) {
        let fila = filas[i];
        
        if (fila.getElementsByTagName("td").length === 0) continue;
        
        let celdas = fila.getElementsByTagName("td");
        let mostrarFila = false;
        
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