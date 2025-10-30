import os # <-- ¡ASEGÚRATE DE AÑADIR ESTO AL INICIO!
from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-$52nviwot-l2p!@c*%43f$9^t*6vek(q4plrl6=o5_2^1w*aa!'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = []


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'operadores', # <-- Tu app
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'gestor.urls'

# --- CONFIGURACIÓN DE PLANTILLAS CORREGIDA ---
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        # Aquí le decimos a Django que busque tu carpeta 'templates'
        'DIRS': [os.path.join(BASE_DIR, 'templates')],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'gestor.wsgi.application'


# --- CONFIGURACIÓN DE BASE DE DATOS CORREGIDA ---
DATABASES = {
    'default': {
        'ENGINE': 'mssql',
        
        'NAME': 'RRHH', 
        'HOST': r'DASHBOARDSRV\SQLEXPRESS', 
        'PORT': '',
        
        # --- ¡EL CAMBIO ES AQUÍ! ---
        # Dejamos USUARIO y PASSWORD vacíos
        'USER': '',
        'PASSWORD': '', 

        'OPTIONS': {
            'driver': 'ODBC Driver 11 for SQL Server',
            'Encrypt': 'no',
            
            # ¡AÑADIMOS ESTA LÍNEA!
            # Esto activa la Autenticación de Windows
            'Trusted_Connection': 'yes',
        },
    }
}

# Password validation
# https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',},
]


# Internationalization
LANGUAGE_CODE = 'es' # (Cambiado a español)
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True


# --- CONFIGURACIÓN DE ARCHIVOS ESTÁTICOS CORREGIDA ---
STATIC_URL = 'static/'

# Añade esta línea para encontrar tu carpeta 'static'
STATICFILES_DIRS = [os.path.join(BASE_DIR, 'static')]

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'