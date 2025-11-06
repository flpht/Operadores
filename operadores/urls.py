# Estas son las URLs de mi app 'operadores'
from django.urls import path,include
from . import views

urlpatterns = [
    # La vista principal que lista Y agrega
    path('', views.lista_operadores, name='lista_operadores'),
    path('turnos/', views.turnos, name='turnos'),
    path("api/operadores", views.api_operadores_por_area, name="api_operadores_area"),
    path('turnos/extrusion/',  views.turnos_extrusion,  name='turnos_extrusion'),
    path('turnos/mezclado/',  views.turnos_mezclado,  name='turnos_mezclado'),
    path('turnos/laminado/',  views.turnos_laminado,  name='turnos_laminado'),
    path('turnos/impresion/', views.turnos_impresion, name='turnos_impresion'),
    path('turnos/sellado/',   views.turnos_sellado,   name='turnos_sellado'),
    path('turnos/corte/',     views.turnos_corte,     name='turnos_corte'),

        path('turnos/exportar/', views.exportar_turnos_pdf, name='turnos_exportar'),

    # La vista para eliminar (ej: /eliminar/1181/)
    path('eliminar/<int:pk>/', views.eliminar_operador, name='eliminar_operador'),
]