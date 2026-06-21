<?php
// api/db.php - Conexión a la base de datos

$host = 'localhost';
$dbname = 'sindicato_guardias';
$username = 'root';  // Usuario por defecto de XAMPP
$password = '';      // Contraseña vacía por defecto en XAMPP

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch(PDOException $e) {
    http_response_code(500);
    die(json_encode(['error' => 'Error de conexión a la base de datos: ' . $e->getMessage()]));
}

// Función para manejar errores y devolver JSON
function sendJsonResponse($data, $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

// Configurar CORS para desarrollo local
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
?>