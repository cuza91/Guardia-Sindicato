# 📋 GUÍA DE DESPLIEGUE - Gestión de Guardias Sindicato

> Documentación completa para desplegar la aplicación en cualquier servidor (XAMPP, WAMP, MAMP, Producción, VPS, Hosting)

---

## 📌 Tabla de Contenidos

1. [Requisitos Previos](#requisitos-previos)
2. [Estructura del Proyecto](#estructura-del-proyecto)
3. [Despliegue en XAMPP/WAMP/MAMP Local](#despliegue-en-xamppwampmamp-local)
4. [Despliegue en Servidor de Producción](#despliegue-en-servidor-de-producción)
5. [Configuración de la Base de Datos](#configuración-de-la-base-de-datos)
6. [Configuración del Proyecto](#configuración-del-proyecto)
7. [Migración de Datos](#migración-de-datos)
8. [Verificación y Pruebas](#verificación-y-pruebas)
9. [Solución de Problemas](#solución-de-problemas)
10. [Mantenimiento](#mantenimiento)
11. [Checklist de Despliegue](#checklist-de-despliegue)

---

## ✅ Requisitos Previos

### Software Necesario

| Componente | Versión Mínima | Descarga |
|------------|---------------|----------|
| **Web Server** | Apache 2.4+ | [XAMPP](https://www.apachefriends.org/) / [WAMP](https://www.wampserver.com/) |
| **PHP** | PHP 7.4+ | Incluido en XAMPP/WAMP |
| **MySQL** | MySQL 5.7+ | Incluido en XAMPP/WAMP |
| **Navegador** | Chrome/Firefox/Edge | Actualizado |

### Extensiones PHP Requeridas

```ini
extension=pdo_mysql
extension=json
extension=mbstring

Puertos Necesarios
Puerto	Protocolo	Uso
80	HTTP	Apache
443	HTTPS	Apache (SSL)
3306	MySQL	Base de Datos



Estructura del Proyecto

guardias-sindicato/
├── index.html                 # Página principal
├── styles.css                 # Estilos CSS
├── script.js                  # Lógica de la aplicación
├── users.json                 # Usuarios (solo para desarrollo)
├── base.json                  # Datos iniciales
├── .htaccess                  # Configuración Apache (opcional)
├── README.md                  # Este archivo
└── api/                       # API Backend
    ├── db.php                 # Conexión a la base de datos
    ├── config.php             # Gestión de configuración
    ├── auth.php               # Autenticación de usuarios
    ├── workers.php            # CRUD de trabajadores
    ├── guards.php             # CRUD de guardias
    ├── days.php               # Gestión de días de guardia
    ├── test.php               # Prueba de conexión (crear al desplegar)
    └── check.php              # Diagnóstico completo (crear al desplegar)

Despliegue en XAMPP/WAMP/MAMP Local
Paso 1: Instalar el Servidor

    Descargar e instalar XAMPP desde apachefriends.org

    Ejecutar el instalador con permisos de administrador

    Seleccionar componentes: Apache, MySQL, phpMyAdmin

    Ruta recomendada: C:\xampp\ (Windows) o /opt/lampp/ (Linux)

    Paso 2: Iniciar Servicios
    # En Windows (Panel de Control de XAMPP)
- Abrir XAMPP Control Panel
- Click en "Start" para Apache
- Click en "Start" para MySQL

# En Linux (Terminal)
sudo /opt/lampp/lampp start apache
sudo /opt/lampp/lampp start mysql

# Verificar estado
sudo /opt/lampp/lampp status

Paso 3: Crear la Base de Datos

    Abrir phpMyAdmin: http://localhost/phpmyadmin

    Crear nueva base de datos: sindicato_guardias (collation: utf8mb4_unicode_ci)

    Ejecutar script SQL (ver sección Configuración de la Base de Datos)

    Alternativa vía línea de comandos:
    # Windows (cmd)
C:\xampp\mysql\bin\mysql -u root -p < database.sql

# Linux
mysql -u root -p < database.sql

Paso 4: Copiar Archivos
# Windows
xcopy /E "C:\ruta\origen\guardias-sindicato" "C:\xampp\htdocs\guardias-sindicato\"

# Linux
cp -r /ruta/origen/guardias-sindicato /opt/lampp/htdocs/

# Verificar
ls /opt/lampp/htdocs/guardias-sindicato/

Paso 5: Configurar Permisos (Linux)
# Dar permisos a la carpeta
sudo chmod -R 755 /opt/lampp/htdocs/guardias-sindicato/

# Dar permisos a los archivos PHP
sudo chmod 644 /opt/lampp/htdocs/guardias-sindicato/api/*.php

Paso 6: Configurar el Proyecto
Abrir api/db.php y verificar configuración:
$host = 'localhost';
$dbname = 'sindicato_guardias';
$username = 'root';      // XAMPP: root, WAMP: root, MAMP: root
$password = '';          // XAMPP: vacío, WAMP: vacío, MAMP: root

Abrir script.js y verificar la URL de la API:
const API_URL = 'api/';  // Para carpeta en htdocs directo
// o
const API_URL = '/guardias-sindicato/api/';  // Si está en subcarpeta

Paso 7: Verificar Instalación

Abrir navegador: http://localhost/guardias-sindicato/

Iniciar sesión: Usuario: admin | Contraseña: admin

Verificar carga de datos: Los datos de base.json deberían cargarse automáticamente



