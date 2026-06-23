-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 23-06-2026 a las 03:10:09
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `sindicato_guardias`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `configuracion`
--

CREATE TABLE `configuracion` (
  `clave` varchar(50) NOT NULL,
  `valor` varchar(255) NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Volcado de datos para la tabla `configuracion`
--

INSERT INTO `configuracion` (`clave`, `valor`, `updated_at`) VALUES
('current_year', '2026', '2026-06-21 07:16:24'),
('last_worker_index', '0', '2026-06-21 07:16:24');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `dias_guardia`
--

CREATE TABLE `dias_guardia` (
  `id` int(11) NOT NULL,
  `fecha` date NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `guardias`
--

CREATE TABLE `guardias` (
  `id` int(11) NOT NULL,
  `fecha` date NOT NULL,
  `worker_id` bigint(20) DEFAULT NULL,
  `completada` tinyint(1) DEFAULT 0,
  `catedra` varchar(100) DEFAULT '',
  `notas` text DEFAULT '',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Volcado de datos para la tabla `guardias`
--

INSERT INTO `guardias` (`id`, `fecha`, `worker_id`, `completada`, `catedra`, `notas`, `created_at`, `updated_at`) VALUES
(11, '2026-06-02', 1781469978334, 1, 'Idiomas', '', '2026-06-21 07:16:25', '2026-06-21 07:16:25'),
(12, '2026-06-04', 1781469978351, 1, 'FPT', '', '2026-06-21 07:16:25', '2026-06-21 07:16:25'),
(13, '2026-06-09', 1781469978328, 1, 'FQ', '', '2026-06-21 07:16:25', '2026-06-21 07:16:25'),
(14, '2026-06-11', 1781469978338, 1, 'Idiomas', '', '2026-06-21 07:16:25', '2026-06-21 07:16:25'),
(15, '2026-06-15', 1781469978319, 1, 'MAT', '', '2026-06-21 07:16:25', '2026-06-21 07:16:25'),
(16, '2026-06-16', 1781469978315, 1, 'COM', '', '2026-06-21 07:16:25', '2026-06-21 07:16:25'),
(17, '2026-06-18', 1781469978348, 1, 'FPT', '', '2026-06-21 07:16:25', '2026-06-21 07:16:25'),
(18, '2026-06-22', 1781698703183, 1, 'Idiomas', 'Verificar Nombre', '2026-06-21 07:16:25', '2026-06-22 22:14:05'),
(19, '2026-06-24', 1781698865579, 0, 'FQ', '', '2026-06-21 07:16:25', '2026-06-21 07:16:25'),
(20, '2026-06-25', 1781469978317, 0, 'MAT', '', '2026-06-21 07:16:25', '2026-06-21 07:16:25'),
(21, '2026-06-29', 1781469978349, 0, 'FPT', '', '2026-06-21 07:16:25', '2026-06-21 07:16:25'),
(22, '2026-01-03', 1781469978315, 1, 'COM', 'Guardia de 24 horas', '2026-06-21 07:16:25', '2026-06-21 07:16:25'),
(24, '2026-06-30', 1781469978357, 0, 'COM', '', '2026-06-21 07:16:25', '2026-06-21 08:07:22');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `trabajadores`
--

CREATE TABLE `trabajadores` (
  `id` bigint(20) NOT NULL,
  `nombre` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Volcado de datos para la tabla `trabajadores`
--

INSERT INTO `trabajadores` (`id`, `nombre`, `created_at`) VALUES
(1781469978315, 'Miguel Noa Cuza', '2026-06-21 07:16:25'),
(1781469978316, 'René Mustelier Cuevas', '2026-06-21 07:16:25'),
(1781469978317, 'Kenia Pérez Téllez', '2026-06-21 07:16:25'),
(1781469978318, 'Bertha Libertad Emasabe Fuentes', '2026-06-21 07:16:25'),
(1781469978319, 'María Caridad Pérez Martinó', '2026-06-21 07:16:25'),
(1781469978320, 'Milaidys Pérez Vedey', '2026-06-21 07:16:25'),
(1781469978322, 'Arael Padró Caldentey', '2026-06-21 07:16:25'),
(1781469978323, 'Sandy Sánchez Domínguez', '2026-06-21 07:16:25'),
(1781469978324, 'Raizi Chaveco Clavel', '2026-06-21 07:16:25'),
(1781469978325, 'Magalis Rengifo Guillot', '2026-06-21 07:16:25'),
(1781469978326, 'Rafael Pozo Pozo', '2026-06-21 07:16:25'),
(1781469978327, 'Yarisleidys Martínez Faure', '2026-06-21 07:16:25'),
(1781469978328, 'Yexi Fernández Chacón', '2026-06-21 07:16:25'),
(1781469978329, 'Rolando Palacios Ramírez', '2026-06-21 07:16:25'),
(1781469978330, 'Yusleidi Sojo Drago', '2026-06-21 07:16:25'),
(1781469978331, 'Marisel Acebo López', '2026-06-21 07:16:25'),
(1781469978332, 'Ricardo Boza Rizo', '2026-06-21 07:16:25'),
(1781469978333, 'Rosa Delia López Rico', '2026-06-21 07:16:25'),
(1781469978334, 'Yanet Medina Frómeta', '2026-06-21 07:16:25'),
(1781469978335, 'Vilma Ferrer Bardet', '2026-06-21 07:16:25'),
(1781469978336, 'Tamara Ferrer Bardet', '2026-06-21 07:16:25'),
(1781469978337, 'Giannia Benítez Alayo', '2026-06-21 07:16:25'),
(1781469978338, 'Migdalia Temó Despaigne', '2026-06-21 07:16:25'),
(1781469978339, 'Milagros Valiente García', '2026-06-21 07:16:25'),
(1781469978340, 'Solineidys Montoya Badell', '2026-06-21 07:16:25'),
(1781469978341, 'Lién Maine Casadesús', '2026-06-21 07:16:25'),
(1781469978342, 'Ariana Veránez Quiala', '2026-06-21 07:16:25'),
(1781469978343, 'Rodolfo Hernández Álvarez', '2026-06-21 07:16:25'),
(1781469978344, 'Arnaldo Sanabria León', '2026-06-21 07:16:25'),
(1781469978345, 'Ángel M. Freyre Fonceca', '2026-06-21 07:16:25'),
(1781469978346, 'Daniel Garzón Ruiz', '2026-06-21 07:16:25'),
(1781469978347, 'Roberto López Castro', '2026-06-21 07:16:25'),
(1781469978348, 'Juan Carlos Barrientos Barrientos', '2026-06-21 07:16:25'),
(1781469978349, 'Ignacio Valiente Duharte', '2026-06-21 07:16:25'),
(1781469978350, 'Arturo Vinent Rivera', '2026-06-21 07:16:25'),
(1781469978351, 'Idarmis Romero Sánchez', '2026-06-21 07:16:25'),
(1781469978352, 'Yimelsis García Pérez', '2026-06-21 07:16:25'),
(1781469978353, 'Ana Libia Ferrer Quezada', '2026-06-21 07:16:25'),
(1781469978354, 'Yamirka Balanzó Coca', '2026-06-21 07:16:25'),
(1781469978355, 'Melba Vivian Vázquez Hardy', '2026-06-21 07:16:25'),
(1781469978356, 'Dayamí Acosta Hernández', '2026-06-21 07:16:25'),
(1781469978357, 'Jorge Arian Montero Isaac', '2026-06-21 07:16:25'),
(1781469978358, 'Juaquín Campos R.', '2026-06-21 07:16:25'),
(1781469978359, 'Félix González Isaguirre', '2026-06-21 07:16:25'),
(1781469978360, 'Lucía Arada Corría', '2026-06-21 07:16:25'),
(1781469978361, 'José Correa Noriega', '2026-06-21 07:16:25'),
(1781469978362, 'Esperanza Sánchez Luna', '2026-06-21 07:16:25'),
(1781469978363, 'María C. Stevent Rosillo', '2026-06-21 07:16:25'),
(1781469978364, 'Roberto Verdecia García', '2026-06-21 07:16:25'),
(1781469978365, 'Jorge Luis Olivares Casas', '2026-06-21 07:16:25'),
(1781698703183, 'Dorli Montoya', '2026-06-21 07:16:25'),
(1781698865579, 'Yania Verdecia Acosta', '2026-06-21 07:16:25');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','worker') NOT NULL DEFAULT 'worker',
  `worker_id` bigint(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id`, `username`, `password`, `role`, `worker_id`, `created_at`) VALUES
(6, 'admin', '$2y$10$mqTGoFSqtBtADHeKAvk5ee4JKJI8ZmRIjEOx8DmdweQP8qsCu10ZS', 'admin', NULL, '2026-06-22 22:28:13'),
(7, 'miguel', '$2y$10$H.p4kaf6YrAqAyXxI.xDle7.XfylGkwGdNtTodLLi.kwhVemR0FoK', 'worker', 1781469978315, '2026-06-22 22:28:13'),
(8, 'yiya', '$2y$10$50/Unb5ABegTYAnwbKRHIOlngef97fyPAFIBleD4mqH19ho4C/Ohm', 'worker', 1781469978352, '2026-06-22 22:28:13'),
(9, 'yami', '$2y$10$XjfoR3AdBM6z.hnjM58ymOKGho9f1DwCwN22iUHwnLJYYEw4u7JHm', 'worker', 1781469978354, '2026-06-22 22:28:13');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `configuracion`
--
ALTER TABLE `configuracion`
  ADD PRIMARY KEY (`clave`);

--
-- Indices de la tabla `dias_guardia`
--
ALTER TABLE `dias_guardia`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `fecha` (`fecha`);

--
-- Indices de la tabla `guardias`
--
ALTER TABLE `guardias`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_fecha` (`fecha`),
  ADD KEY `idx_worker` (`worker_id`);

--
-- Indices de la tabla `trabajadores`
--
ALTER TABLE `trabajadores`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `dias_guardia`
--
ALTER TABLE `dias_guardia`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `guardias`
--
ALTER TABLE `guardias`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `guardias`
--
ALTER TABLE `guardias`
  ADD CONSTRAINT `guardias_ibfk_1` FOREIGN KEY (`worker_id`) REFERENCES `trabajadores` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
