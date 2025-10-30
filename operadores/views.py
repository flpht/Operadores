# operadores/views.py
from django.shortcuts import render, redirect, get_object_or_404
from .models import Operador, AreaCentroCosto 
from .forms import OperadorForm
import json
from django.contrib import messages

def lista_operadores(request):
    """
    Esta es mi vista principal. Maneja la LISTA (GET)
    y también el formulario para AGREGAR (POST).
    """
    
    if request.method == 'POST':
        form = OperadorForm(request.POST)
        if form.is_valid():
            operador = form.save(commit=False)
            operador.EmpresaId = 1
            operador.Horario = 1
            operador.password = 0
            operador.save()
            messages.success(request, f"¡Operador '{operador.Nombre}' agregado con éxito!")
            return redirect('lista_operadores')
        else:
            messages.error(request, "Error al agregar. Revisa los campos del formulario.")
    else:
        form = OperadorForm()

    # --- LÓGICA PARA LOS DROPDOWNS ---
    # (Esta parte ya la teníamos, la usamos para los dropdowns Y para el mapa)
    centros_costo = AreaCentroCosto.objects.all()
    
    areas_unicas = sorted(list(set(c.Area for c in centros_costo if c.Area)))
    areas_data = {}
    for area in areas_unicas:
        areas_data[area] = []
    
    for c in centros_costo:
        if c.Area in areas_data:
            areas_data[c.Area].append({
                'id': int(c.IdCentroCosto), 
                'maquina': c.Maquina
            })
    
    # --- ¡NUEVA LÓGICA PARA LA TABLA! ---
    # 1. Creo un "mapa" de búsqueda rápido: {IdCentroCosto: NombreDelArea}
    #    Ej: {1108: 'Extrusion', 1207: 'Impresion', 1319: 'Sellado'}
    area_map = {c.IdCentroCosto: c.Area for c in centros_costo}

    # 2. Busco todos mis operadores
    operadores = Operador.objects.all().order_by('Nombre')

    # 3. Recorro los operadores y les "inyecto" el nombre del Área
    for op in operadores:
        # op.CentroCosto es el ID (ej: 1108)
        # area_map.get(...) busca ese ID en el mapa
        op.area_nombre = area_map.get(op.CentroCosto, '---') # '---' si no lo encuentra
    # --- FIN DE LA NUEVA LÓGICA ---
    
    contexto = {
        'operadores': operadores, # Mi lista de operadores ahora tiene '.area_nombre'
        'form': form,
        'areas_unicas': areas_unicas,
        'areas_data_json': json.dumps(areas_data),
    }
    return render(request, 'lista_operadores.html', contexto)


def eliminar_operador(request, pk):
    """
    Mi vista para eliminar (con mensaje de éxito).
    """
    operador = get_object_or_404(Operador, CodigoID=pk)
    
    if request.method == 'GET':
        return render(request, 'eliminar_operador.html', {'operador': operador})

    elif request.method == 'POST':
        messages.success(request, f"Operador '{operador.Nombre}' eliminado correctamente.")
        operador.delete()
        return redirect('lista_operadores')

def eliminar_operador(request, pk):
    """
    Busca un operador por su CodigoID (pk) y lo elimina.
    """
    operador = get_object_or_404(Operador, CodigoID=pk)
    
    if request.method == 'GET':
        return render(request, 'eliminar_operador.html', {'operador': operador})

    elif request.method == 'POST':
        # --- ¡NUEVA LÍNEA! ---
        # Añade un mensaje de éxito al eliminar
        messages.success(request, f"Operador '{operador.Nombre}' eliminado correctamente.")
        operador.delete()
        return redirect('lista_operadores')