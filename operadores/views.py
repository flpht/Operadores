# operadores/views.py
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.http import (
    HttpResponse, HttpResponseBadRequest, JsonResponse
)
from django.views.decorators.http import require_GET
from django.utils import timezone
from django.template.loader import render_to_string
from django.db import connection

from datetime import date, datetime
import json
import os

from .models import Operador, AreaCentroCosto
from .forms import OperadorForm


# =========================
# Pantalla principal (CRUD)
# =========================
def lista_operadores(request):
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

    centros_costo = AreaCentroCosto.objects.all()

    areas_unicas = sorted(list(set(c.Area for c in centros_costo if c.Area)))
    areas_data = {a: [] for a in areas_unicas}
    for c in centros_costo:
        if c.Area in areas_data:
            areas_data[c.Area].append({'id': int(c.IdCentroCosto), 'maquina': c.Maquina})

    area_map = {c.IdCentroCosto: c.Area for c in centros_costo}

    operadores = Operador.objects.filter(Activo=True).order_by('Nombre')
    for op in operadores:
        op.area_nombre = area_map.get(op.CentroCosto, '---')

    contexto = {
        'operadores': operadores,
        'form': form,
        'areas_unicas': areas_unicas,
        'areas_data_json': json.dumps(areas_data),
    }
    return render(request, 'lista_operadores.html', contexto)


def eliminar_operador(request, pk):
    operador = get_object_or_404(Operador, CodigoID=pk)

    if request.method == 'GET':
        return render(request, 'eliminar_operador.html', {'operador': operador})

    elif request.method == 'POST':
        messages.success(request, f"Operador '{operador.Nombre}' eliminado correctamente.")
        operador.delete()
        return redirect('lista_operajadores')


# ==============
# Pantalla Turnos
# ==============
def turnos(request):
    return render(request, 'turnos.html', {})


# =====================
# API: Operadores por área
# =====================
@require_GET
def api_operadores_por_area(request):
    """
    GET /api/operadores?area=Impresión
    - Incluye SIEMPRE Codoperador 0 y 1111
    - Para el resto: por área (case/accent-insensitive), internos activos o externos.
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
              oa.Codoperador IN (0, 1111)
           OR (
                (LTRIM(RTRIM(oa.Area)) COLLATE Modern_Spanish_CI_AI =
                 %s COLLATE Modern_Spanish_CI_AI)
             AND (o.CodigoID IS NULL OR o.Activo = 1)
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


# =========
# Subvistas
# =========
def _ctx():
    return {"hoy": date.today()}

def turnos_extrusion(request):  return render(request, 'turnos/turnos_extrusion.html',  _ctx())
def turnos_mezclado(request):   return render(request, 'turnos/turnos_mezclado.html',   _ctx())
def turnos_laminado(request):   return render(request, 'turnos/turnos_laminado.html',   _ctx())

def turnos_impresion(request):
    sections = [
        {"key": "imp_encargado", "title": "Encargado de Clisses", "cap": 1},
        {"key": "imp_apoyo",     "title": "Montajista",             "cap": 2},
        {"key": "imp_encargado", "title": "Encargado de Sección",   "cap": 1},
        {"key": "imp_colorista", "title": "Tintas / Colorista",     "cap": 3},
        {"key": "imp_comexi",    "title": "Operadores Comexi 1",    "cap": 3},
        {"key": "imp_comexi",    "title": "Operadores Comexi 2",    "cap": 1},
        {"key": "imp_primaflex", "title": "Operador Primaflex",     "cap": 1},
        {"key": "imp_feva2",     "title": "Operadores Feva 2",      "cap": 2},
        {"key": "imp_apoyo",     "title": "Apoyo Impresión",        "cap": 3},
        {"key": "imp_apoyo",     "title": "Mecat./Lavd.Bandejas",   "cap": 2},
    ]
    return render(request, "turnos/turnos_impresion.html", {"sections": sections})

def turnos_sellado(request):    return render(request, 'turnos/turnos_sellado.html',    _ctx())
def turnos_corte(request):      return render(request, 'turnos/turnos_corte.html',      _ctx())


# =========================
# Exportación a PDF (wkhtml)
# =========================
try:
    import pdfkit
except Exception:
    pdfkit = None

WKHTML_BIN = r"C:\Program Files\wkhtmltopdf\bin\wkhtmltopdf.exe"  # Ajusta si corresponde.

MESES_ES = [
    "enero","febrero","marzo","abril","mayo","junio",
    "julio","agosto","septiembre","octubre","noviembre","diciembre"
]

def _fmt_spanish(d: date) -> str:
    return f"{d.day} de {MESES_ES[d.month-1]}"

def _normalize_roles(raw_roles):
    """
    Convierte variantes a {title, cap, t1, t2, t3} con listas de nombres.
    Acepta claves: t1/t2/t3, turno1/2/3, mañana/manana, tarde, noche.
    """
    norm = []
    for r in (raw_roles or []):
        title = r.get("title") or r.get("puesto") or r.get("seccion") or ""
        cap   = r.get("cap") or r.get("capacity") or r.get("capacidad") or 0

        t1 = r.get("t1") or r.get("turno1") or r.get("mañana") or r.get("manana") or []
        t2 = r.get("t2") or r.get("turno2") or r.get("tarde")  or []
        t3 = r.get("t3") or r.get("turno3") or r.get("noche")  or []

        t1 = [str(x) for x in (t1 or [])]
        t2 = [str(x) for x in (t2 or [])]
        t3 = [str(x) for x in (t3 or [])]

        norm.append({"title": title, "cap": cap, "t1": t1, "t2": t2, "t3": t3})
    return norm


def turnos_impresion_pdf(request):
    """
    URL: /turnos/impresion/pdf?from=YYYY-MM-DD&to=YYYY-MM-DD&area=Impresión
    - GET requiere from/to/area.
    - Si el frontend realiza POST con JSON {"roles":[...]}, se imprimen los nombres por turno.
    """
    d1 = request.GET.get("from")
    d2 = request.GET.get("to")
    area = request.GET.get("area", "Impresión")

    if not d1 or not d2:
        return HttpResponseBadRequest("Faltan parámetros 'from' y 'to' (YYYY-MM-DD).")
    try:
        dt1 = datetime.strptime(d1, "%Y-%m-%d").date()
        dt2 = datetime.strptime(d2, "%Y-%m-%d").date()
    except ValueError:
        return HttpResponseBadRequest("Formato de fecha inválido. Usa YYYY-MM-DD.")

    # Recibir roles desde el frontend (POST JSON {"roles":[...]})
    roles = []
    if request.method == "POST":
        try:
            payload = json.loads(request.body.decode("utf-8") or "{}")
            roles = _normalize_roles(payload.get("roles") or [])
        except Exception:
            roles = []

    # Fallback si no llegan roles (estructura de secciones)
    sections = [
        {"key": "imp_encargado", "title": "Encargado de Clisses", "cap": 1},
        {"key": "imp_apoyo",     "title": "Montajista",             "cap": 2},
        {"key": "imp_encargado", "title": "Encargado de Sección",   "cap": 1},
        {"key": "imp_colorista", "title": "Tintas / Colorista",     "cap": 3},
        {"key": "imp_comexi",    "title": "Operadores Comexi 1",    "cap": 3},
        {"key": "imp_comexi",    "title": "Operadores Comexi 2",    "cap": 1},
        {"key": "imp_primaflex", "title": "Operador Primaflex",     "cap": 1},
        {"key": "imp_feva2",     "title": "Operadores Feva 2",      "cap": 2},
        {"key": "imp_apoyo",     "title": "Apoyo Impresión",        "cap": 3},
        {"key": "imp_apoyo",     "title": "Mecat./Lavd.Bandejas",   "cap": 2},
    ]

    week_number = dt1.isocalendar()[1]
    ctx = {
        "area": area,
        "from": dt1,
        "to": dt2,
        "from_label": _fmt_spanish(dt1),
        "to_label": _fmt_spanish(dt2),
        "week_number": week_number,
        "generated_at": timezone.localtime().strftime("%d-%m-%Y %H:%M"),
        "roles": roles,               # si viene POST, la plantilla mostrará nombres
        "sections": sections,         # fallback
        "shifts_meta": [
            {"n": 1, "label": "Mañana 07:00–15:00"},
            {"n": 2, "label": "Tarde 14:00–22:00"},
            {"n": 3, "label": "Noche 22:00–07:00"},
        ],
    }

    html = render_to_string("turnos/pdf_impresion.html", ctx)

    if pdfkit is None:
        return JsonResponse({"error": "pdfkit (wkhtmltopdf) no instalado en el servidor."}, status=500)
    if not os.path.exists(WKHTML_BIN):
        return JsonResponse({"error": f"wkhtmltopdf no encontrado en {WKHTML_BIN}."}, status=500)

    config = pdfkit.configuration(wkhtmltopdf=WKHTML_BIN)
    options = {
    "page-size": "A4",
    "orientation": "Landscape",      # <= fuerza horizontal
    "encoding": "UTF-8",
    "margin-top": "10mm",
    "margin-right": "10mm",
    "margin-bottom": "10mm",
    "margin-left": "10mm",
    "dpi": 300,
    "print-media-type": True,        # <= respeta tu CSS @page
}


    try:
        pdf_bytes = pdfkit.from_string(html, False, configuration=config, options=options)
    except Exception as e:
        return JsonResponse({"error": f"Error generando PDF: {e}"}, status=500)

    resp = HttpResponse(pdf_bytes, content_type="application/pdf")
    resp["Content-Disposition"] = f'inline; filename="turnos_{area}_sem{week_number}.pdf"'
    return resp
