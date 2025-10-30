# Estas son las URLs de mi app 'operadores'
from django.urls import path
from . import views

urlpatterns = [
    # La vista principal que lista Y agrega
    path('', views.lista_operadores, name='lista_operadores'),
    
    # La vista para eliminar (ej: /eliminar/1181/)
    path('eliminar/<int:pk>/', views.eliminar_operador, name='eliminar_operador'),
]