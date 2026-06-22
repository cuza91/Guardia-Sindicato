<?php
// api/hash_password.php
// Herramienta para generar hashes de contraseñas
// Ejecutar desde línea de comandos o navegador

if (php_sapi_name() === 'cli') {
    // Modo línea de comandos
    if ($argc < 2) {
        echo "Uso: php hash_password.php <contraseña>\n";
        echo "Ejemplo: php hash_password.php admin\n";
        exit(1);
    }
    $password = $argv[1];
    $hash = password_hash($password, PASSWORD_DEFAULT);
    echo "Contraseña: $password\n";
    echo "Hash: $hash\n";
    exit(0);
}

// Modo navegador
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generador de Hash de Contraseñas</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
        input, button { padding: 10px; font-size: 16px; }
        input { width: 60%; }
        button { cursor: pointer; background: #0d6efd; color: white; border: none; border-radius: 5px; }
        .result { margin-top: 20px; background: #f8f9fa; padding: 15px; border-radius: 5px; word-break: break-all; }
        .hash { color: #198754; font-weight: bold; font-family: monospace; }
    </style>
</head>
<body>
    <h1>🔐 Generador de Hash de Contraseñas</h1>
    <p>Introduce la contraseña que deseas hashear:</p>
    <form method="POST">
        <input type="text" name="password" placeholder="Escribe la contraseña..." required>
        <button type="submit">Generar Hash</button>
    </form>
    
    <?php if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['password'])): ?>
        <?php 
            $password = $_POST['password'];
            $hash = password_hash($password, PASSWORD_DEFAULT);
        ?>
        <div class="result">
            <p><strong>Contraseña original:</strong> <?php echo htmlspecialchars($password); ?></p>
            <p><strong>Hash generado:</strong></p>
            <p class="hash"><?php echo htmlspecialchars($hash); ?></p>
            <p style="font-size:14px;color:#6c757d;">
                ⚡ Copia este hash y úsalo en la base de datos o en users.json
            </p>
        </div>
    <?php endif; ?>
    
    <p style="margin-top:30px;font-size:14px;color:#6c757d;">
        ⚠️ Esta herramienta genera hashes usando <code>password_hash()</code> con algoritmo BCRYPT.
    </p>
</body>
</html>
<?php
?>