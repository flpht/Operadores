# operadores/views.py
from django.shortcuts import render, redirect, get_object_or_404
from .models import Operador, AreaCentroCosto # Importamos ambos modelos
from .forms import OperadorForm
import json # Importamos json

def lista_operadores(request):
    """
    Esta vista maneja la LISTA (GET)
    y el formulario para AGREGAR (POST).
    """
    
    if request.method == 'POST':
        form = OperadorForm(request.POST)
        if form.is_valid():
            
            # --- ¡AQUÍ ESTÁ LA MODIFICACIÓN! ---
            # 1. Crea el objeto en memoria, pero NO lo guardes en la BD todavía
            operador = form.save(commit=False)
            
            # 2. Añade tus valores predeterminados (basado en la imagen)
            operador.EmpresaId = 1
            operador.Horario = 1
            operador.password = 0
            
            # (No necesitas añadir 'privilege', 'password', etc.
            # La base de datos lo hará sola.)

            # 3. Ahora sí, guarda el objeto completo en la BD
            operador.save()
            # --- FIN DE LA MODIFICACIÓN ---
            
            return redirect('lista_operadores')
        # Si no es válido, se re-renderiza con el formulario mostrando errores
    
    else:
        # Si es GET, crea un formulario vacío
        form = OperadorForm()

    # --- LÓGICA PARA LOS DROPDOWNS ---
    centros_costo = AreaCentroCosto.objects.all()
    
    # 1. Crear lista de áreas únicas
    areas_unicas = sorted(list(set(c.Area for c in centros_costo if c.Area)))

    # 2. Crear un diccionario para el cascading en JS
    areas_data = {}
    for area in areas_unicas:
        areas_data[area] = []
    
    for c in centros_costo:
        if c.Area in areas_data:
            areas_data[c.Area].append({
                
                # Convertimos el Decimal a int para que JSON pueda leerlo
                'id': int(c.IdCentroCosto), 
                # ---------------------------------
                
                'maquina': c.Maquina
            })
    # --- FIN LÓGICA DROPDOWNS ---

    # Obtiene la lista de operadores (para la tabla)
    operadores = Operador.objects.all().order_by('Nombre')
    
    contexto = {
        'operadores': operadores,
        'form': form, # El formulario (con el campo CentroCosto oculto)
        'areas_unicas': areas_unicas, # Para el primer dropdown
        'areas_data_json': json.dumps(areas_data), # Datos para JS
    }
    return render(request, 'lista_operadores.html', contexto)


def eliminar_operador(request, pk):
    """
    Busca un operador por su CodigoID (pk) y lo elimina,
    mostrando una página de confirmación primero (si es GET).
    """
    operador = get_object_or_404(Operador, CodigoID=pk)
    
    # Si esta vista se llama desde un link (GET), muestra confirmación
    if request.method == 'GET':
        return render(request, 'eliminar_operador.html', {'operador': operador})

    # Si se llama desde el formulario de confirmación (POST)
    elif request.method == 'POST':
        operador.delete()
        return redirect('lista_operadores')