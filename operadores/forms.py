# Este es mi formulario de Django para agregar un operador
from django import forms
from .models import Operador

class OperadorForm(forms.ModelForm):
    class Meta:
        model = Operador
        
        # Le digo al formulario qué campos de mi modelo quiero mostrar.
        # 'EmpresaId', 'Horario' y 'password' no los pongo aquí
        # porque los asigno yo mismo en la vista (views.py).
        fields = [
            'CodigoID', 
            'Nombre', 
            'Rut', 
            'Activo', 
            'CentroCosto' 
        ]
        
        # Etiquetas personalizadas para que se vea mejor
        labels = {
            'CodigoID': 'Código Operador',
            'CentroCosto': 'Centro de Costo', # Aunque está oculto, es bueno tenerlo
        }
        
        # ¡IMPORTANTE! Oculto el campo 'CentroCosto' original.
        # Lo voy a llenar con JavaScript usando mis nuevos dropdowns.
        widgets = {
            'CentroCosto': forms.HiddenInput(),
        }