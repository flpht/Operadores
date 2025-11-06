# operadores/views.py
from django.shortcuts import render, redirect, get_object_or_404
from .models import Operador, AreaCentroCosto 
from .forms import OperadorForm
import json
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.http import require_GET
from django.db import connection
from datetime import date
from django.utils.dateparse import parse_date
from django.views.decorators.http import require_POST
from django.template.loader import render_to_string
from datetime import datetime

from django.http import HttpResponse, JsonResponse




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
    
    
    area_map = {c.IdCentroCosto: c.Area for c in centros_costo}

    # 2. Busco todos mis operadores
    operadores = Operador.objects.filter(Activo=True).order_by('Nombre')

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

def turnos(request):
    contexto = {} 
    
    return render(request, 'turnos.html', contexto)


@require_GET
def api_operadores_por_area(request):
    """
    GET /api/operadores?area=Impresión
    - Incluye SIEMPRE Codoperador 0 y 1111 (sin importar el área)
    - Para los demás: por área (case/accent-insensitive), internos activos o externos.
    """
    area = request.GET.get("area")
    if not area:
        return JsonResponse({"error": "Parámetro 'area' es requerido"}, status=400)

    sql = """
        SELECT oa.Codoperador, oa.Nombre, oa.Area
        FROM Operadores_Areas AS oa
        LEFT JOIN RelojEmpleados AS o
               ON o.CodigoID = oa.Codoperador
        WHERE
              oa.Codoperador IN (0, 1111)                      -- SIEMPRE
           OR (
                (LTRIM(RTRIM(oa.Area)) COLLATE Modern_Spanish_CI_AI =
                 %s COLLATE Modern_Spanish_CI_AI)             -- área (tolerante)
             AND (o.CodigoID IS NULL OR o.Activo = 1)          -- externo o activo
              )
        ORDER BY
            CASE WHEN oa.Codoperador IN (0,1111) THEN 0 ELSE 1 END,
            oa.Nombre
    """
    with connection.cursor() as cur:
        cur.execute(sql, [area])
        rows = cur.fetchall()

    items = [{"CodigoID": r[0], "Nombre": r[1], "Rol": "Operador"} for r in rows]
    return JsonResponse({"items": items})


def _ctx():
    return { "hoy": date.today() }

def turnos_extrusion(request):  return render(request, 'turnos/turnos_extrusion.html',  _ctx())
def turnos_mezclado(request):   return render(request, 'turnos/turnos_mezclado.html',   _ctx())
def turnos_laminado(request):   return render(request, 'turnos/turnos_laminado.html',   _ctx())
def turnos_impresion(request):
    sections = [
        {"key": "imp_encargado", "title": "Encargado de Clisses", "cap": 1},
        {"key": "imp_apoyo", "title": "Montajista", "cap": 2},
        {"key": "imp_encargado", "title": "Encargado de Sección", "cap": 1},
        {"key": "imp_colorista", "title": "Tintas / Colorista", "cap": 3},
        {"key": "imp_comexi", "title": "Operadores Comexi 1", "cap": 3},
        {"key": "imp_comexi", "title": "Operadores Comexi 2", "cap": 1},
        {"key": "imp_primaflex", "title": "Operador Primaflex", "cap": 1},
        {"key": "imp_feva2", "title": "Operadores Feva 2", "cap": 2},
        {"key": "imp_apoyo", "title": "Apoyo Impresión", "cap": 3},
        {"key": "imp_apoyo", "title": "Mecat./Lavd.Bandejas", "cap": 2},
        


    ]
    return render(
        request,
        "turnos/turnos_impresion.html",
        {"sections": sections}  # <- aquí viaja tu plantilla de roles
    )
def turnos_sellado(request):    return render(request, 'turnos/turnos_sellado.html',    _ctx())
def turnos_corte(request):      return render(request, 'turnos/turnos_corte.html',      _ctx())







try:
    from weasyprint import HTML, CSS
    WEASYPRINT_OK = True
except Exception:
    WEASYPRINT_OK = False





@require_POST
def exportar_turnos_pdf(request):
    """
    Espera JSON:
    {
      "area": "Impresión",
      "date_from": "2025-11-03",
      "date_to":   "2025-11-09",
      "data": { date, shifts, absences },  // serializeAssignments()
      "operators": { "101": "NOMBRE", ... } // opcional (map id->nombre)
    }
    """
    if not WEASYPRINT_OK:
        return JsonResponse({"error": "WeasyPrint no disponible en el servidor."}, status=500)

    try:
        payload = json.loads(request.body.decode('utf-8'))
    except Exception:
        return JsonResponse({"error":"JSON inválido"}, status=400)

    area = payload.get('area') or 'Planta'
    date_from = parse_date(payload.get('date_from') or '')
    date_to   = parse_date(payload.get('date_to') or '')
    data = payload.get('data') or {}
    opmap = payload.get('operators') or {}

    # Deriva semana/rango legible
    def fmt(d):
        if not d: return ''
        # formato: dd/mm/yyyy
        return d.strftime('%d/%m/%Y')

    rango_txt = ''
    semana_txt = ''
    if date_from and date_to:
        rango_txt = f"desde el {fmt(date_from)} hasta el {fmt(date_to)}"
        # “semana XX (año)” basado en ISO week del 'date_from'
        iso = date_from.isocalendar()  # (year, week, weekday)
        semana_txt = f"Semana {iso[1]} - {iso[0]}"
    elif data.get('date'):
        # compat: si el user solo usa date único
        try:
            unica = datetime.strptime(data['date'], '%Y-%m-%d').date()
            rango_txt = f"del {fmt(unica)}"
            iso = unica.isocalendar()
            semana_txt = f"Semana {iso[1]} - {iso[0]}"
        except Exception:
            pass

    # En el template transformaremos ids a nombres usando este map
    context = {
        "area": area,
        "rango_txt": rango_txt,
        "semana_txt": semana_txt,
        "data": data,
        "operators": opmap  # dict {id(str/int): nombre}
    }

    html_string = render_to_string('turnos/pdf_turno.html', context)
    # Estilos de impresión (A4 apaisado, tipografías, etc.)
    PRINT_CSS = """
      @page { size: A4 landscape; margin: 14mm; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #111827; }
      h1 { font-size: 20px; margin: 0 0 8px; }
      h2 { font-size: 16px; margin: 0 0 14px; color:#374151; }
      .muted { color:#6B7280; }
      .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
      .col { border: 1px solid #E5E7EB; border-radius: 8px; padding: 10px; }
      .col h3 { font-size: 14px; margin: 0 0 8px; }
      .section { margin-bottom: 8px; }
      .section-title { font-weight: 600; font-size: 12px; margin-bottom: 4px; display:flex; justify-content:space-between; }
      .pill { color:#111827; background:#F3F4F6; border:1px solid #E5E7EB; display:inline-block; padding: 2px 6px; border-radius: 999px; margin: 2px 4px 0 0; font-size: 11px; }
      .abs { margin-top: 12px; border-top:1px dashed #E5E7EB; padding-top: 10px; }
      .abs h4 { margin: 0 0 6px; font-size: 12px; }
      table.meta { width:100%; margin: 10px 0 14px; font-size:12px; border-collapse: collapse; }
      table.meta td { padding: 4px 6px; border: 1px solid #E5E7EB; }
    """

    pdf = HTML(string=html_string, base_url=request.build_absolute_uri('/')).write_pdf(
        stylesheets=[CSS(string=PRINT_CSS)]
    )
    filename = f"turnos_{area.replace(' ','_')}_{datetime.now().strftime('%Y%m%d_%H%M')}.pdf"
    resp = HttpResponse(pdf, content_type='application/pdf')
    resp['Content-Disposition'] = f'attachment; filename="{filename}"'
    return resp