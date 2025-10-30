# Mis modelos, que leen las tablas que ya tengo en SQL Server
from django.db import models

# --- Mi modelo principal para los operadores ---
class Operador(models.Model):
    
    # ¡OJO! Este campo debe ser IntegerField (un número) para que coincida con mi BBDD.
    # Me estaba dando errores de 'conversion' porque lo tenía como CharField.
    CodigoID = models.IntegerField(db_column='CodigoID', primary_key=True) 
    
    Nombre = models.CharField(db_column='Nombre', max_length=255)
    Rut = models.CharField(db_column='Rut', max_length=15, blank=True, null=True)
    Activo = models.BooleanField(db_column='Activo')
    
    # Tuve que agregar 'password' porque mi BBDD no permite NULLs.
    # Le pongo un valor 'default' para que no moleste.
    password = models.IntegerField(db_column='password', default=0)
    
    # Estos son los campos que lleno con valores predeterminados en la vista (ej: EmpresaId=1)
    EmpresaId = models.IntegerField(db_column='EmpresaId')
    Horario = models.IntegerField(db_column='Horario', blank=True, null=True)
    
    # Este es el campo que lleno con los dropdowns en cascada
    CentroCosto = models.IntegerField(db_column='CentroCosto', blank=True, null=True)

    class Meta:
        # ¡IMPORTANTE! Le digo a Django que NO gestione esta tabla.
        # Yo ya la tengo creada en SQL Server.
        managed = False  
        
        # El nombre exacto de mi tabla en la BBDD 'RRHH'
        db_table = 'RelojEmpleados' 
            
    def __str__(self):
        # Para que se vea bonito el nombre en el admin de Django
        return self.Nombre

# --- Mi segundo modelo, para las Áreas y Centros de Costo ---
class AreaCentroCosto(models.Model):
    # La llave primaria de mi tabla 'Area_centrocostos'
    IdCentroCosto = models.IntegerField(db_column='IdCentroCosto', primary_key=True)
    Maquina = models.CharField(db_column='Maquina', max_length=255)
    Area = models.CharField(db_column='Area', max_length=255)

    class Meta:
        # Igual que la otra, Django no debe gestionarla
        managed = False
        db_table = 'Area_centrocostos'
        # Así me aseguro de que los dropdowns salgan ordenados
        ordering = ['Area', 'Maquina'] 

    def __str__(self):
        # Esto es lo que se mostrará en mi dropdown de "Máquina"
        return f"{self.Area} - {self.Maquina} ({self.IdCentroCosto})"