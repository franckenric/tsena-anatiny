-- phpMyAdmin SQL Dump
-- version 5.2.1deb3
-- https://www.phpmyadmin.net/
--
-- Hôte : localhost:3306
-- Généré le : ven. 16 oct. 2026 à 18:10
-- Version du serveur : 8.0.46-0ubuntu0.24.04.4
-- Version de PHP : 8.3.6

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `tsena_anatiny`
--

-- --------------------------------------------------------

--
-- Structure de la table `alembic_version`
--

CREATE TABLE `alembic_version` (
  `version_num` varchar(32) COLLATE utf8mb4_general_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `alembic_version`
--

INSERT INTO `alembic_version` (`version_num`) VALUES
('c3d4e5f6a7b8');

-- --------------------------------------------------------

--
-- Structure de la table `cart_items`
--

CREATE TABLE `cart_items` (
  `id` int NOT NULL,
  `customer_id` int NOT NULL,
  `product_id` int NOT NULL,
  `quantity` int NOT NULL,
  `unit_cost` float DEFAULT NULL,
  `another_price` float DEFAULT NULL,
  `other_price_reason` text COLLATE utf8mb4_general_ci,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `variant_id` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `cart_items`
--

INSERT INTO `cart_items` (`id`, `customer_id`, `product_id`, `quantity`, `unit_cost`, `another_price`, `other_price_reason`, `created_at`, `updated_at`, `deleted_at`, `variant_id`) VALUES
(1, 1, 7, 1, 50000, 0, NULL, '2026-10-11 13:04:54', '2026-10-11 13:05:06', NULL, NULL);

-- --------------------------------------------------------

--
-- Structure de la table `categories`
--

CREATE TABLE `categories` (
  `id` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `status` enum('active','inactive') COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `categories`
--

INSERT INTO `categories` (`id`, `name`, `description`, `status`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 'Chaussures', 'Chaussures et sneakers pour homme et femme', 'active', '2026-10-11 07:56:22', '2026-10-11 07:56:22', NULL),
(2, 'Vêtements', 'T-shirts, chemises, pantalons et plus', 'active', '2026-10-11 07:56:22', '2026-10-11 07:56:22', NULL),
(3, 'Téléphone & accessoires', 'Housses, coques, câbles et chargeurs', 'active', '2026-10-11 07:56:22', '2026-10-11 07:56:22', NULL),
(4, 'Voiture & accessoires', 'Lampes LED, ampoules et accessoires auto', 'active', '2026-10-11 07:56:22', '2026-10-11 07:56:22', NULL);

-- --------------------------------------------------------

--
-- Structure de la table `customers`
--

CREATE TABLE `customers` (
  `id` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `phone` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `delivery_address` text COLLATE utf8mb4_general_ci,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `users_id` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `customers`
--

INSERT INTO `customers` (`id`, `name`, `phone`, `delivery_address`, `created_at`, `updated_at`, `deleted_at`, `users_id`) VALUES
(1, 'Franck HENRI', '+261348876304', 'henrif544@gmail.com', '2026-10-11 13:04:32', '2026-10-11 13:04:32', NULL, 2),
(2, 'Harson', '+261340478111', 'tanjombato', '2026-10-11 20:12:29', '2026-10-11 20:12:29', NULL, NULL);

-- --------------------------------------------------------

--
-- Structure de la table `lots`
--

CREATE TABLE `lots` (
  `id` int NOT NULL,
  `reference` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `total_expense` float NOT NULL DEFAULT '0',
  `received_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `lots`
--

INSERT INTO `lots` (`id`, `reference`, `total_expense`, `received_at`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 'ACHAT-20261003', 380000, '2026-10-03 00:00:00', '2026-10-11 08:14:08', '2026-10-11 11:58:39', NULL),
(2, 'ACHAT-20260916', 0, '2026-09-16 00:00:00', '2026-10-11 13:21:51', '2026-10-11 13:22:39', NULL);

-- --------------------------------------------------------

--
-- Structure de la table `lot_expenses`
--

CREATE TABLE `lot_expenses` (
  `id` int NOT NULL,
  `lot_id` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `amount` float NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `lot_expenses`
--

INSERT INTO `lot_expenses` (`id`, `lot_id`, `name`, `description`, `amount`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 1, 'Transport', NULL, 380000, '2026-10-11 11:58:17', '2026-10-11 11:58:17', NULL),
(2, 1, 'Boost-pages', NULL, 50000, '2026-10-11 11:58:39', '2026-10-11 11:58:39', NULL),
(3, 2, 'Transport', NULL, 110000, '2026-10-11 13:22:39', '2026-10-11 13:22:39', NULL);

-- --------------------------------------------------------

--
-- Structure de la table `notifications`
--

CREATE TABLE `notifications` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `type` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `order_id` int DEFAULT NULL,
  `order_number` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `message` text COLLATE utf8mb4_general_ci,
  `customer_name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `customer_phone` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `total` float DEFAULT NULL,
  `previous_status` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `status` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `read` tinyint(1) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `notifications`
--

INSERT INTO `notifications` (`id`, `user_id`, `type`, `order_id`, `order_number`, `title`, `message`, `customer_name`, `customer_phone`, `total`, `previous_status`, `status`, `read`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 1, 'account.created', NULL, NULL, 'Nouveau compte client', 'Compte créé pour Franck HENRI (henrif544@gmail.com). Envoi de l\'OTP par email en cours.', 'Franck HENRI', '+261348876304', 0, NULL, NULL, 0, '2026-10-11 13:04:32', '2026-10-11 13:04:32', NULL),
(2, 1, 'order.created', 1, '20261011172035-708E20', 'Nouvelle commande', 'Commande 20261011172035-708E20 de Harson', 'Harson', '+261340478111', 108000, NULL, 'draft', 0, '2026-10-11 20:20:35', '2026-10-11 20:20:35', NULL),
(3, 1, 'order.status_changed', 1, '20261011172035-708E20', 'Statut modifié', 'Commande 20261011172035-708E20 : En cours → Confirmée', 'Harson', '+261340478111', 0, 'draft', 'confirmed', 0, '2026-10-11 20:20:48', '2026-10-11 20:20:48', NULL),
(4, 1, 'order.status_changed', 1, '20261011172035-708E20', 'Statut modifié', 'Commande 20261011172035-708E20 : Confirmée → Livrée', 'Harson', '+261340478111', 0, 'confirmed', 'delivered', 0, '2026-10-11 20:20:58', '2026-10-11 20:20:58', NULL);

-- --------------------------------------------------------

--
-- Structure de la table `orders`
--

CREATE TABLE `orders` (
  `id` int NOT NULL,
  `order_number` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `status` enum('draft','confirmed','delivered','cancelled') COLLATE utf8mb4_general_ci DEFAULT NULL,
  `note` text COLLATE utf8mb4_general_ci,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `customer_id` int DEFAULT NULL,
  `another_price` float DEFAULT '0',
  `other_price_reason` text COLLATE utf8mb4_general_ci,
  `promo_code_id` int DEFAULT NULL,
  `promo_code` varchar(64) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `discount` float NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `orders`
--

INSERT INTO `orders` (`id`, `order_number`, `user_id`, `status`, `note`, `created_at`, `updated_at`, `deleted_at`, `customer_id`, `another_price`, `other_price_reason`, `promo_code_id`, `promo_code`, `discount`) VALUES
(1, '20261011172035-708E20', 1, 'delivered', '__pending_lines__[{\"product_id\": 4, \"product_name\": \"Urban Trek Tech – Baskets Montantes Tactiques\", \"variant_id\": 15, \"variant_name\": \"Pointure 41\", \"quantity\": 1, \"unit_cost\": 45000.0, \"another_price\": 0, \"other_price_reason\": null}, {\"product_id\": 1, \"product_name\": \"Baskets Montantes pour Homme et Femme style Planche\", \"variant_id\": 1, \"variant_name\": \"Pointure 40\", \"quantity\": 1, \"unit_cost\": 35000.0, \"another_price\": 0, \"other_price_reason\": null}, {\"product_id\": 2, \"product_name\": \"AeroTrend – Baskets Sport & Urbain\", \"variant_id\": 6, \"variant_name\": \"Pointure 40\", \"quantity\": 1, \"unit_cost\": 28000.0, \"another_price\": 0, \"other_price_reason\": null}]', '2026-10-11 20:20:35', '2026-10-11 20:20:58', NULL, 2, 0, NULL, NULL, NULL, 0);

-- --------------------------------------------------------

--
-- Structure de la table `otp_codes`
--

CREATE TABLE `otp_codes` (
  `id` int NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `code_hash` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `attempts` int NOT NULL,
  `is_used` tinyint(1) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `otp_codes`
--

INSERT INTO `otp_codes` (`id`, `email`, `code_hash`, `attempts`, `is_used`, `expires_at`, `created_at`) VALUES
(1, 'henrif544@gmail.com', '$2b$12$bQ4JDy79S9sf0UZ6qp4x5.mXn7dwuORgdV358cceu1eCvh3Acjmrq', 0, 1, '2026-10-11 10:14:33', '2026-10-11 13:04:32');

-- --------------------------------------------------------

--
-- Structure de la table `products`
--

CREATE TABLE `products` (
  `id` int NOT NULL,
  `category_id` int DEFAULT NULL,
  `sku` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `image` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `unit` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `low_stock_alert` int DEFAULT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `selling_price` float DEFAULT NULL,
  `discount_price` float DEFAULT NULL,
  `cost_price` float DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `products`
--

INSERT INTO `products` (`id`, `category_id`, `sku`, `name`, `description`, `image`, `unit`, `low_stock_alert`, `status`, `created_at`, `updated_at`, `deleted_at`, `selling_price`, `discount_price`, `cost_price`) VALUES
(1, 1, 'RC-3387A0B27FD9', 'Baskets Montantes pour Homme et Femme style Planche', 'Ces baskets montantes pour homme sont parfaites pour les skateurs et les amateurs de mode urbaine. Elles disposent d\'un design élégant en rouge et noir, avec une tige respirante en mesh et une semelle extérieure en caoutchouc durable pour une adhérence optimale. Le col rembourré offre un confort et un soutien accrus, tandis que le style montant offre une protection supplémentaire de la cheville. Que vous alliez au skatepark ou que vous fassiez des courses, ces baskets vous donneront une allure stylée et vous procureront un confort tout au long de la journée.', '/files/products/170191d4c5fe4f1ab831e42f71bb767f.jpg', 'pieces', NULL, 'active', '2026-10-11 08:15:23', '2026-10-11 10:36:38', NULL, NULL, NULL, 17756),
(2, 1, 'RC-55CB749AC479', 'AeroTrend – Baskets Sport & Urbain', '<p>Adoptez un style moderne et urbain avec ces baskets blanches légères et polyvalentes. Conçues pour offrir un confort optimal au quotidien, elles intègrent une semelle amortissante idéale pour la marche et les activités légères.&nbsp;</p><p><ul><li><b>Design moderne :</b> Finition soignée avec des détails graphiques tendance (« Fashion », « Sup / Trend Culture »).&nbsp;</li><li><b>Confort &amp; Respirabilité :</b> Tige perforée à l\'avant pour une meilleure aération et semelle équipée de coussins d\'air pour un excellent amorti.&nbsp;</li><li><b>Polyvalence :</b> Parfaites pour le printemps et l\'automne, associant style sportif et tenue décontractée au quotidien.&nbsp;</li></ul></p>', '/files/products/d761d6037add4024a4b5e0598c573bc3.jpg', NULL, NULL, 'active', '2026-10-11 10:43:32', '2026-10-11 12:48:12', NULL, NULL, NULL, 13800),
(3, 1, 'RC-34F88C65AD02', 'Wave Street Art – Sneakers Rétro & Urbaines', '<p>Affirmez votre style avec ces baskets rétro au design streetwear unique, inspirées des motifs d\'estampes japonaises et de la culture urbaine. Elles combinent parfaitement esthétique moderne et confort au quotidien.&nbsp;</p><p><ul><li><b>Design artistique :</b> Imprimé vagues artistiques sur les côtés associant du blanc, du noir et des renforts gris.&nbsp;</li><li><b>Détails urbains : </b>Inscriptions typographiques dynamiques (« SPORT.2023 », « Wart The mainstream », « LOOK FOR THE STAR »).&nbsp;</li><li><b>Confort &amp; Robustesse </b>: Semelle extérieure crantée et amortissante assurant une bonne adhérence et un maintien optimal.&nbsp;</li><li><b>Polyvalence :</b> Idéales pour compléter un style vestimentaire décontracté, streetwear ou sportif au quotidien.&nbsp;&nbsp;</li></ul></p>', '/files/products/42ed3eb4b3974055b842a57ae97dbb0e.jpg', NULL, NULL, 'active', '2026-10-11 10:51:06', '2026-10-11 11:42:28', NULL, NULL, NULL, 20700),
(4, 1, 'RC-8E4474064842', 'Urban Trek Tech – Baskets Montantes Tactiques', '<p>Associez style urbain et look utilitaire avec ces chaussures montantes grises au design moderne et technique. Conçues pour un usage quotidien au printemps et en automne, elles offrent à la fois confort, maintien et résistance.&nbsp;</p><p><ul><li><b>Lacet rotatif (Dial System) :</b> Système de serrage rapide et précis par molette pour un enfilage facile et un ajustement parfait.&nbsp;</li><li><b>Design technique &amp; streetwear :</b> Fini daim/suédine gris avec des détails graphiques et un cordon décoratif sur le côté.&nbsp;</li><li><b>Maintien montant :</b> Coupe mi-haute qui maintient bien la cheville tout en restant confortable pour la marche.&nbsp;</li><li><b>Semelle robuste :</b> Semelle extérieure crantée assurant une bonne adhérence sur différentes surfaces.</li></ul></p>', '/files/products/50b3fca01d124d7898f023fb4a6e5ba6.jpg', NULL, NULL, 'active', '2026-10-11 10:58:27', '2026-10-11 12:56:09', NULL, NULL, NULL, 22724),
(5, 1, 'RC-F1C7352D350F', 'Urban High Top – Sneakers Style Skate & Streetwear', '<p><span>Affirmez votre look avec ces baskets montantes blanches au style streetwear audacieux et contemporain. Conçues pour allier tendance et confort, elles apportent une touche originale à toutes vos tenues décontractées.&nbsp;</span></p><p></p><ul><li><span><b>Design streetwear</b> : Motifs typographiques originaux (« HITOFF », « WHITE », « Sport ») et empiècements contrastés noirs et imprimés.&nbsp;</span></li><li><span><b>Coupe montante </b>: Tige mi-haute avec col rembourré pour un bon maintien de la cheville et un confort optimal au quotidien.</span></li><li><span><b>Semelle épaisse</b> : Semelle plateforme moderne offrant un excellent amorti et une allure urbaine affirmée.</span></li><li><span><b>Aération &amp; Maintien</b> : Avant-pied perforé pour une meilleure respirabilité et laçage ajusté.</span></li></ul><p></p>', '/files/products/8e0a9be06d9f4569a8ee5efdf5024838.jpg', NULL, NULL, 'active', '2026-10-11 11:19:56', '2026-10-11 11:38:08', NULL, NULL, NULL, 18354),
(6, 4, 'RC-0566AB71A1FC', 'Ocean Wave High – Sneakers Montantes Tendance', 'Démarquez-vous avec ces baskets montantes élégantes et dynamiques, combinant un blanc éclatant à des touches de bleu marine et un col au motif marbré artistique. Conçues pour offrir un style jeune et moderne au quotidien.&nbsp;<div><ul><li><b>Design soigné :</b> Mariage harmonieux de blanc, de bleu marine et d\'un imprimé marbré au niveau du col.&nbsp;</li><li><b>Coupe mi-haute : </b>Maintien agréable de la cheville avec une languette allongée et une double boucle d\'enfilage rapide.&nbsp;</li><li><b>Semelle épaisse &amp; Amortie :</b> Semelle plateforme dynamique sculptée avec des inserts d\'aération pour un confort de marche supérieur.&nbsp;</li><li><b>Détails tendance :</b> Finitions épurées avec inscription subtile « FASHION » et motifs latéraux minimalistes.&nbsp;</li></ul></div>', '/files/products/34d120edb0704ae0b8b8c77e4408cbd7.jpg', NULL, NULL, 'active', '2026-10-11 11:47:18', '2026-10-11 12:47:08', NULL, 55000, NULL, 24840),
(7, 4, 'RC-0B81014900E8', 'Royal Chef 13 – Batterie de Cuisine Antiadhésive Complète', 'Équipez votre cuisine avec cette batterie de cuisine complète de 13 pièces au design noir élégant et moderne. Idéale pour réussir toutes vos recettes au quotidien, elle combine praticité, durabilité et cuisson sans effort.&nbsp;<div><ul><li><b>Set complet 13 pièces :</b> Comprend des faitouts/marmites avec couvercles en verre, une casserole, une poêle et un ensemble d\'ustensiles de cuisine assortis.&nbsp;</li><li><b>Revêtement antiadhésif : </b>Permet une cuisson saine avec peu de matière grasse et facilite grandement le nettoyage.&nbsp;</li><li><b>Couvercles en verre trempé :</b> Équipés de poignées ergonomiques pour suivre la cuisson sans perdre la chaleur.&nbsp;</li><li><b>Ustensiles inclus :</b> Spatules et louches adaptées au revêtement antiadhésif pour ne pas rayer vos ustensiles de cuisson.&nbsp;</li></ul></div>', '/files/products/06d8a0990db24327bf8eba0389f2358e.jpg', 'Pieces', NULL, 'active', '2026-10-11 11:54:12', '2026-10-11 12:48:29', NULL, 55000, 50000, 17710),
(8, 3, 'RC-720C891B94E7', 'Candy Case Soft – Coque en Silicone Mat aux Couleurs Pastel', 'Apportez une touche de couleur et de douceur à votre smartphone avec cette collection de coques en TPU souple au fini mat doux. Conçues pour allier protection efficace et esthétique pastel moderne au quotidien.&nbsp;<div><ul><li><b>Large palette de couleurs : </b>Disponible en une multitude de teintes vives et pastel (« Candy Colors ») pour personnaliser votre téléphone selon vos envies.&nbsp;</li><li><b>Fini mat &amp; Toucher doux </b>: Texture dépolie « Soft Touch » agréable en main, résistant aux traces de doigts et facile à nettoyer.&nbsp;</li><li><b>Protection &amp; Matériau TPU : </b>Matière en TPU souple pour absorber efficacement les chocs, chutes légères et rayures.&nbsp;</li><li><b>Ajustement parfait :</b> Découpes précises pour les objectifs photo, les boutons et les connecteurs.</li></ul></div>', '/files/products/b8b461b1376a48f48f770aa911163380.jpg', NULL, NULL, 'active', '2026-10-11 13:25:05', '2026-10-11 14:20:04', NULL, NULL, NULL, 3634),
(9, 3, 'RC-75790324269D', 'SlimGuard Matte – Coque Antichoc Translucide', '<p>Protégez votre smartphone avec élégance grâce à cette coque rigide au dos translucide et dépoli. Son design moderne met en valeur la couleur d\'origine de votre téléphone tout en lui apportant une touche de couleur et de protection renforcée.&nbsp;</p><p><ul><li><b>Dos dépoli translucide :</b> Finition mate élégante qui laisse entrevoir le design du téléphone tout en évitant les traces de doigts.&nbsp;</li><li><b>Boutons contrastés :</b> Boutons latéraux de couleurs vives (rouge, orange, jaune) pour un look tendance et un appui réactif.&nbsp;</li><li><b>Protection renforcée du bloc caméra :</b> Encadrement surélevé et ajusté autour des objectifs photo pour éviter les rayures lors de la pose à plat.&nbsp;</li><li><b>Prise en main confortable :</b> Contours en silicone souple offrant un excellent maintien antidérapant et une bonne absorption des chocs.</li></ul></p>', '/files/products/2ed85923186c4b98a3f7f4161ba2ea8e.jpg', NULL, NULL, 'active', '2026-10-11 13:44:46', '2026-10-11 13:47:38', NULL, NULL, NULL, 2392),
(10, 3, 'RC-2C7E74920C1B', 'Urban Cross Art – Coque Tendance Style Streetwear', '<p>Donnez un look moderne et branché à votre téléphone grâce à cette coque rigide au dos dépoli, ornée de motifs graphiques contemporains. Elle offre un équilibre parfait entre style streetwear tendance et protection efficace au quotidien.&nbsp;</p><p><ul><li><b>Design streetwear &amp;amp; graphique :</b> Imprimés croisés géométriques modernes, typographie « GERTRUDE™ » et détails subtils.&nbsp;</li><li><b>Fini translucide dépoli :</b> Texture mate agréable au toucher qui protège contre les traces de doigts et laisse deviner le design de l\'appareil.&nbsp;</li><li><b>Protection caméra intégrée :</b> Contour renforcé autour des objectifs photo avec l\'inscription « SO COOL » pour une sécurité optimale contre les rayures.&nbsp;</li><li><b>Prise en main ergonomique :</b> Contours ajustés offrant une excellente protection antichoc et une manipulation confortable.</li></ul></p>', '/files/products/67a5777862114a5495f97b0edd839a7f.jpg', NULL, NULL, 'active', '2026-10-11 13:54:34', '2026-10-11 14:17:46', NULL, NULL, NULL, 3450),
(11, 3, 'RC-41194084072E', 'Love Gradient – Coque Dégradée avec Cœur & Dragonne Anneau', 'Sublimez votre téléphone avec cette coque élégante au magnifique dégradé de couleurs, ornée d\'un détail en forme de cœur et accompagnée de son pendentif assorti. Elle offre un look chic tout en garantissant une excellente prise en main au quotidien.&nbsp;<div><ul><li><b style=\"color: rgb(22, 27, 45); font-size: 0.875rem;\">Design dégradé &amp; romantique : </b><span style=\"color: rgb(22, 27, 45); font-size: 0.875rem;\">Effet de couleur fondue élégant sublimé par un motif double cœur et l\'inscription « LOVE YOU ».&nbsp;</span></li><li><b>Pendentif / Dragonne assorti :</b> Inclut une dragonne avec anneau de maintien et un médaillon au motif coordonné pour sécuriser la prise en main et éviter les chutes.&nbsp;</li><li><b>Protection caméra intégrée :</b> Contour de caméra renforcé gravé du message « GOOD LUCK » pour protéger vos objectifs des rayures.&nbsp;</li><li><b>Fini mat &amp; Antidérapant :</b> Surface douce et agréable au toucher qui protège votre smartphone contre les chocs et les rayures légères.</li></ul></div>', '/files/products/783cf5ceef75416e97e8db9aa99f6555.jpg', NULL, NULL, 'active', '2026-10-11 14:01:24', '2026-10-11 14:04:46', NULL, NULL, NULL, 5888),
(12, 3, 'RC-0DDFE3126B77', 'PowerSync 60W – Câble USB-C vers USB-C Charge Rapide', '<span style=\"color: rgb(22, 27, 45); font-size: 0.875rem;\">Rechargez et synchronisez vos appareils en toute efficacité avec ce câble USB-C vers USB-C haute performance de 60W. Conçu pour offrir une charge rapide et un transfert de données fluide, c\'est l\'accessoire indispensable pour vos smartphones, tablettes et ordinateurs portables compatibles.&nbsp;</span><div><ul><li><span style=\"color: rgb(22, 27, 45); font-size: 0.875rem;\"><b>Charge rapide 60W :</b> Supporte une puissance jusqu\'à 60W pour recharger rapidement tous vos équipements compatibles USB-C.&nbsp;</span></li><li><span style=\"color: rgb(22, 27, 45); font-size: 0.875rem;\"><b>Double embout USB-C : </b>Connectique Type-C vers Type-C universelle et réversible pour une utilisation facile au quotidien.&nbsp;</span></li><li><span style=\"color: rgb(22, 27, 45); font-size: 0.875rem;\"><b>Transfert de données rapide :</b> Permet la synchronisation efficace de vos fichiers, photos et documents entre vos appareils.&nbsp;</span></li><li><span style=\"color: rgb(22, 27, 45); font-size: 0.875rem;\"><b>Conception durable &amp; flexible :</b> Gaine résistante et renforcée aux extrémités pour éviter l\'usure et les faux contacts lors des pliages fréquents.</span></li></ul></div>', '/files/products/7c4d0dd75f8a4879a4ef985909374c68.jpg', NULL, NULL, 'active', '2026-10-11 14:25:17', '2026-10-11 14:28:35', NULL, 10000, NULL, 1840),
(13, 3, 'REF-20261011143349-W4V9', 'Mini FlashReader 2.0 – Lecteur de Carte Micro SD Ultra-Compact', 'Transférez facilement vos fichiers et transformez vos cartes Micro SD / TF en clé USB grâce à ce lecteur de carte ultra-compact et coloré. Idéal pour un usage quotidien au bureau, en voiture ou en déplacement.&nbsp;<div><ul><li><span style=\"color: rgb(22, 27, 45); font-size: 0.875rem;\"><b>Format ultra-mini :</b> Design compact et léger, facile à transporter dans une poche ou à accrocher à un porte-clés grâce à son œillet intégré.&nbsp;</span></li><li><span style=\"color: rgb(22, 27, 45); font-size: 0.875rem;\"><b>Interface USB 2.0 : </b>Offre un transfert rapide et stable de vos photos, vidéos, musiques et documents.&nbsp;</span></li><li><span style=\"color: rgb(22, 27, 45); font-size: 0.875rem;\"><b>Compatibilité universelle (Plug &amp; Play) </b>: Fonctionne immédiatement sans installation de pilote sur ordinateurs, Autoradios, TV et boîtiers multimédias.&nbsp;</span></li><li><span style=\"color: rgb(22, 27, 45); font-size: 0.875rem;\"><b>Finition métallisée :</b> Disponible en plusieurs couleurs vives (bleu, rouge, noir, or) avec une coque en aluminium élégante et résistant aux chocs.&nbsp;</span></li></ul></div>', '/files/products/c16a0b6b51a44deb87cfc23e55930331.jpg', NULL, NULL, 'active', '2026-10-11 14:35:39', '2026-10-11 20:24:18', NULL, NULL, NULL, 1100),
(14, 4, 'REF-20261011204147-R21W', 'Sweat Technique Col Demi-Zip – Confort & Performance au Quotidien', 'Alliez style, confort et praticité avec notre haut à col demi-zip pour homme. Pensé aussi bien pour vos activités sportives (course, fitness, randonnée) que pour un look décontracté au quotidien, ce vêtement est un incontournable de votre garde-robe.&nbsp;<div><ul><li><b>Col Montant Zippé (1/4 Zip) :</b> Permet d\'ajuster facilement la ventilation et apporte une touche élégante et moderne.&nbsp;</li><li><b>Matière Respirante &amp; Extensible :</b> Conçu dans un tissu léger et technique qui évacue la transpiration tout en vous offrant une liberté de mouvement totale.</li><li><b style=\"color: rgb(22, 27, 45); font-size: 0.875rem;\">Coupe Ajustée &amp; Ergonomique : </b><span style=\"color: rgb(22, 27, 45); font-size: 0.875rem;\">S\'adapte parfaitement à la morphologie masculine tout en assurant un confort maximal.</span></li><li><span style=\"color: rgb(22, 27, 45); font-size: 0.875rem;\"><b>Design Épuré &amp; Polyvalent :</b> Se porte aussi bien seul que sous une veste pour superposer les couches.</span></li></ul></div>', '/files/products/5eec78f0353040298dcac95cad2dc518.jpg', 'pieces', NULL, 'active', '2026-10-11 20:44:17', '2026-10-11 20:44:40', NULL, 10000, NULL, 6000),
(15, 4, 'RC-F06ABE2B56EE', 'SuperPower Treble 500W – Paire de Tweeters Audio Voiture', 'Améliorez le système audio de votre véhicule avec cette paire de tweeters à dôme haute efficacité de 500W. Conçus pour restituer des aigus clairs, précis et puissants, ils apportent une excellente définition sonore à vos musiques en voiture.&nbsp;<div><ul><li><b>Haute puissance 500W : </b>Délivre un son aigu puissant et cristallin pour enrichir l\'acoustique de votre système audio auto.&nbsp;</li><li><b>Filtre intégré (Crossover) :</b> Équipé d\'un condensateur interne permettant de protéger les haut-parleurs et de filtrer les fréquences de manière optimale.&nbsp;</li><li><b>Format compact &amp; Installation facile :</b> Conception compacte permettant une intégration simple sur le tableau de bord, les montants ou les portières.&nbsp;</li><li><b>Grille de protection robuste :</b> Dômes protégés par des grilles métalliques résistantes pour éviter tout dommage extérieur.&nbsp;</li></ul></div>', '/files/products/b0b421a5ede74a86bf6264c4ba075b5e.png', 'pieces', NULL, 'active', '2026-10-14 18:40:46', '2026-10-14 18:45:54', NULL, 20000, 18000, 2944),
(16, 4, 'REF-20261016200144-2T4V', 'TS-A1095S – Haut-Parleurs Coaxiaux Auto 4 Pouces (10 cm)', '<p>Améliorez la qualité sonore de votre véhicule avec cette paire de haut-parleurs coaxiaux de 4 pouces (10 cm) au design moderne et dynamique. Conçus pour remplacer facilement les enceintes d\'origine, ils offrent un son équilibré avec des basses claires et des aiguës précises.&nbsp;</p><p><ul><li><b>Format standard 4\" (10 cm) :</b> Dimensions universelles idéales pour une installation facile dans les portières, le tableau de bord ou la plage arrière de la plupart des véhicules.&nbsp;</li><li><b>Conception coaxiale : </b>Intègre un haut-parleur principal pour les médiums/basses et un tweeter central chromé pour restituer des aigus nets.&nbsp;</li><li><b>Design finition chromée : </b>Support de tweeter au look moderne et métallisé apportant une touche esthétique à votre système audio.&nbsp;</li><li><b>Installation facile : </b>Pattes de fixation renforcées et perforées pour un montage rapide et sécurisé sur les emplacements d\'origine;</li></ul></p>', '/files/products/472dc3a1c2e74651a216ce033f88c085.jpg', 'pieces', NULL, 'active', '2026-10-16 20:03:04', '2026-10-16 20:04:43', NULL, 50000, NULL, 30000);

-- --------------------------------------------------------

--
-- Structure de la table `product_images`
--

CREATE TABLE `product_images` (
  `id` int NOT NULL,
  `product_id` int NOT NULL,
  `image` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `position` int NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `product_images`
--

INSERT INTO `product_images` (`id`, `product_id`, `image`, `position`, `created_at`, `updated_at`, `deleted_at`) VALUES
(2, 1, '/files/products/170191d4c5fe4f1ab831e42f71bb767f.jpg', 0, '2026-10-11 08:16:15', '2026-10-11 08:16:15', NULL),
(3, 1, '/files/products/b36dc9b4fd7c4b31a6220a3ef8aba94b.jpg', 1, '2026-10-11 08:16:21', '2026-10-11 08:16:21', NULL),
(5, 1, '/files/products/c9638f10cad44794b983909895786abd.jpg', 2, '2026-10-11 08:16:43', '2026-10-11 08:16:43', NULL),
(6, 1, '/files/products/0d5c082af21a4815b9a7f28e61d804a1.jpg', 3, '2026-10-11 08:16:50', '2026-10-11 08:16:50', NULL),
(7, 2, '/files/products/d761d6037add4024a4b5e0598c573bc3.jpg', 0, '2026-10-11 10:43:58', '2026-10-11 10:43:58', NULL),
(8, 2, '/files/products/350d45e24a61414f891c82a9f71ed5d7.jpg', 1, '2026-10-11 10:44:08', '2026-10-11 10:44:08', NULL),
(9, 3, '/files/products/42ed3eb4b3974055b842a57ae97dbb0e.jpg', 0, '2026-10-11 10:52:09', '2026-10-11 10:52:09', NULL),
(10, 3, '/files/products/b473493f48154066819b94e3c3fb62ce.jpg', 1, '2026-10-11 10:52:23', '2026-10-11 10:52:23', NULL),
(11, 4, '/files/products/50b3fca01d124d7898f023fb4a6e5ba6.jpg', 0, '2026-10-11 10:58:46', '2026-10-11 10:58:46', NULL),
(12, 4, '/files/products/7060132ab7eb4c72ad1019a49c8ba67a.jpg', 1, '2026-10-11 10:58:59', '2026-10-11 10:58:59', NULL),
(13, 4, '/files/products/9566bb0a54ab40b0849ac0edebf57d41.jpg', 2, '2026-10-11 10:59:20', '2026-10-11 10:59:20', NULL),
(15, 5, '/files/products/8e0a9be06d9f4569a8ee5efdf5024838.jpg', 0, '2026-10-11 11:20:25', '2026-10-11 11:20:25', NULL),
(16, 5, '/files/products/5d6c32c83a264093a95b042d255accf6.jpg', 1, '2026-10-11 11:20:28', '2026-10-11 11:20:28', NULL),
(17, 6, '/files/products/34d120edb0704ae0b8b8c77e4408cbd7.jpg', 0, '2026-10-11 11:51:06', '2026-10-11 11:51:06', NULL),
(18, 6, '/files/products/ae366b3f2c584622b1db4bd2bdb7b805.jpg', 1, '2026-10-11 11:51:19', '2026-10-11 11:51:19', NULL),
(19, 6, '/files/products/c166b1f31dd54d23b4af13a6b92ec30d.jpg', 2, '2026-10-11 11:51:28', '2026-10-11 11:51:28', NULL),
(20, 7, '/files/products/06d8a0990db24327bf8eba0389f2358e.jpg', 0, '2026-10-11 11:56:02', '2026-10-11 11:56:02', NULL),
(21, 7, '/files/products/64ecf6581a614da3bcf3f2f8f8d0b002.jpg', 1, '2026-10-11 11:56:06', '2026-10-11 11:56:06', NULL),
(22, 7, '/files/products/70b58932dd2642e283fcf88caa13f1ee.jpg', 2, '2026-10-11 11:56:13', '2026-10-11 11:56:13', NULL),
(23, 7, '/files/products/dfc6720a8b384e41b25fa153162993a1.jpg', 3, '2026-10-11 11:56:19', '2026-10-11 11:56:19', NULL),
(24, 8, '/files/products/b8b461b1376a48f48f770aa911163380.jpg', 0, '2026-10-11 13:30:12', '2026-10-11 13:30:12', NULL),
(25, 8, '/files/products/74b1e36c8c1b42c88d352ce440af7437.jpg', 1, '2026-10-11 13:30:15', '2026-10-11 13:30:15', NULL),
(26, 8, '/files/products/8b7b7c2ddb794448b0347a63b8f50291.jpg', 2, '2026-10-11 13:30:17', '2026-10-11 13:30:17', NULL),
(27, 8, '/files/products/4c0ee1ea42064ff1b89300d2f2d8d974.jpg', 3, '2026-10-11 13:30:21', '2026-10-11 13:30:21', NULL),
(28, 9, '/files/products/2ed85923186c4b98a3f7f4161ba2ea8e.jpg', 0, '2026-10-11 13:47:38', '2026-10-11 13:47:38', NULL),
(29, 9, '/files/products/8776856b02f3431a8081856b41fcdd65.jpg', 1, '2026-10-11 13:47:41', '2026-10-11 13:47:41', NULL),
(30, 9, '/files/products/42724cd116c64e19bbb5aadaa63c24c1.jpg', 2, '2026-10-11 13:47:44', '2026-10-11 13:47:44', NULL),
(31, 9, '/files/products/48e6e8ce2b024220bde2b71e0960dba8.jpg', 3, '2026-10-11 13:47:55', '2026-10-11 13:47:55', NULL),
(32, 10, '/files/products/67a5777862114a5495f97b0edd839a7f.jpg', 0, '2026-10-11 13:58:07', '2026-10-11 13:58:07', NULL),
(33, 10, '/files/products/516e1f6f04df40b8a6da0545f79dd9ca.jpg', 1, '2026-10-11 13:58:18', '2026-10-11 13:58:18', NULL),
(34, 11, '/files/products/783cf5ceef75416e97e8db9aa99f6555.jpg', 0, '2026-10-11 14:04:07', '2026-10-11 14:04:07', NULL),
(35, 11, '/files/products/6ffc33c676e8440db2eeccad58e881db.jpg', 1, '2026-10-11 14:04:16', '2026-10-11 14:04:16', NULL),
(36, 12, '/files/products/7c4d0dd75f8a4879a4ef985909374c68.jpg', 0, '2026-10-11 14:27:05', '2026-10-11 14:27:05', NULL),
(37, 12, '/files/products/0a16d9e10b164bd4b7286a2919ddcdac.jpg', 1, '2026-10-11 14:27:10', '2026-10-11 14:27:10', NULL),
(38, 12, '/files/products/c94758a0908b4ec9a8dc44e60191bf99.jpg', 2, '2026-10-11 14:27:16', '2026-10-11 14:27:16', NULL),
(39, 13, '/files/products/c16a0b6b51a44deb87cfc23e55930331.jpg', 0, '2026-10-11 14:35:55', '2026-10-11 14:35:55', NULL),
(40, 13, '/files/products/49154df3d5494ca295b999d91069a9e5.png', 1, '2026-10-11 14:36:01', '2026-10-11 14:36:01', NULL),
(41, 13, '/files/products/945db80fa50b46c1a448d9810eec1205.jpg', 2, '2026-10-11 14:36:07', '2026-10-11 14:36:07', NULL),
(42, 13, '/files/products/8aae38c29b9d4b16a5679d7b07aaf0aa.jpg', 3, '2026-10-11 14:36:19', '2026-10-11 14:36:19', NULL),
(43, 14, '/files/products/5eec78f0353040298dcac95cad2dc518.jpg', 0, '2026-10-11 20:44:40', '2026-10-11 20:44:40', NULL),
(45, 14, '/files/products/2b37d9ce50e94bf6bbc098fe98129f6b.png', 1, '2026-10-11 20:48:40', '2026-10-11 20:48:40', NULL),
(46, 14, '/files/products/10242ecbe994424d9ee094b34b7764d9.png', 2, '2026-10-11 20:48:45', '2026-10-11 20:48:45', NULL),
(47, 15, '/files/products/b0b421a5ede74a86bf6264c4ba075b5e.png', 0, '2026-10-14 18:45:54', '2026-10-14 18:45:54', NULL),
(48, 15, '/files/products/f6d17e405d7746c7b70fe36b9a634db0.jpg', 1, '2026-10-14 18:46:00', '2026-10-14 18:46:00', NULL),
(49, 15, '/files/products/e4854a32c81340a8ac5b9a6253e4e8f2.jpg', 2, '2026-10-14 18:46:06', '2026-10-14 18:46:06', NULL),
(50, 15, '/files/products/c42d5b042aec43bfaa3aae7d534cd7c8.jpg', 3, '2026-10-14 18:46:13', '2026-10-14 18:46:13', NULL),
(51, 16, '/files/products/472dc3a1c2e74651a216ce033f88c085.jpg', 0, '2026-10-16 20:04:43', '2026-10-16 20:04:43', NULL),
(52, 16, '/files/products/11a366a0486246759b4e52347d8d0d00.jpg', 1, '2026-10-16 20:04:50', '2026-10-16 20:04:50', NULL),
(53, 16, '/files/products/abd7dcda32d841a09eaf46fb15011db2.jpg', 2, '2026-10-16 20:04:58', '2026-10-16 20:04:58', NULL);

-- --------------------------------------------------------

--
-- Structure de la table `product_variants`
--

CREATE TABLE `product_variants` (
  `id` int NOT NULL,
  `product_id` int NOT NULL,
  `parent_id` int DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `sku` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `quantity` int NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `selling_price` float DEFAULT NULL,
  `image` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `unit_cost` float DEFAULT NULL,
  `discount_price` float DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `product_variants`
--

INSERT INTO `product_variants` (`id`, `product_id`, `parent_id`, `name`, `sku`, `quantity`, `created_at`, `updated_at`, `deleted_at`, `selling_price`, `image`, `unit_cost`, `discount_price`) VALUES
(1, 1, NULL, 'Pointure 40', NULL, 0, '2026-10-11 08:22:43', '2026-10-11 20:20:48', NULL, 35000, NULL, 17756, 39000),
(2, 1, NULL, 'Pointure 41', NULL, 1, '2026-10-11 08:23:18', '2026-10-11 12:49:11', NULL, 42000, NULL, 17756, 39000),
(3, 1, NULL, 'Pointure 42', NULL, 2, '2026-10-11 08:23:33', '2026-10-11 20:18:28', NULL, 42000, NULL, 17756, 39000),
(5, 2, NULL, 'Pointure 39', NULL, 1, '2026-10-11 10:47:35', '2026-10-11 12:48:01', NULL, 38000, NULL, 13800, 35000),
(6, 2, NULL, 'Pointure 40', NULL, 0, '2026-10-11 10:47:41', '2026-10-11 20:20:48', NULL, 28000, NULL, 13800, 35000),
(7, 2, NULL, 'Pointure 41', NULL, 1, '2026-10-11 10:47:48', '2026-10-11 12:48:03', NULL, 38000, NULL, 13800, 35000),
(8, 2, NULL, 'Pointure 42', NULL, 1, '2026-10-11 10:48:00', '2026-10-11 12:48:05', NULL, 38000, NULL, 13800, 35000),
(9, 2, NULL, 'Pointure 43', NULL, 1, '2026-10-11 10:48:09', '2026-10-11 12:48:10', NULL, 38000, NULL, 13800, 35000),
(10, 3, NULL, 'Couleur Beige', NULL, 0, '2026-10-11 10:51:06', '2026-10-11 10:51:46', NULL, NULL, NULL, NULL, NULL),
(11, 3, 10, 'Pointure 40', NULL, 2, '2026-10-11 10:51:06', '2026-10-11 12:31:10', NULL, 45000, NULL, 20700, NULL),
(12, 3, NULL, 'Couleur  Blue', NULL, 0, '2026-10-11 10:51:06', '2026-10-11 10:51:54', NULL, NULL, NULL, NULL, NULL),
(13, 3, 12, 'Pointure 42', NULL, 2, '2026-10-11 10:51:06', '2026-10-11 12:31:10', NULL, 45000, NULL, 20700, NULL),
(14, 4, NULL, 'Couleur gris', NULL, 2, '2026-10-11 11:03:10', '2026-10-11 11:03:33', NULL, NULL, NULL, 22724, NULL),
(15, 4, 14, 'Pointure 41', NULL, 1, '2026-10-11 11:03:38', '2026-10-11 20:20:48', NULL, 45000, NULL, 22724, 54000),
(16, 4, NULL, 'Couleur beige', NULL, 2, '2026-10-11 11:04:10', '2026-10-11 11:04:15', NULL, NULL, NULL, 22724, NULL),
(17, 4, 16, 'Pointure 42', NULL, 1, '2026-10-11 11:04:33', '2026-10-11 20:14:07', NULL, 60000, NULL, 22724, 54000),
(18, 5, NULL, 'Pointure 42', NULL, 2, '2026-10-11 11:22:05', '2026-10-11 12:44:49', NULL, 50000, NULL, 18354, 48000),
(20, 6, NULL, 'Couleur blanc-bleu', NULL, 0, '2026-10-11 11:47:18', '2026-10-11 11:50:10', NULL, NULL, NULL, NULL, NULL),
(21, 6, 20, 'Pointure 40', NULL, 1, '2026-10-11 11:47:18', '2026-10-11 12:31:09', NULL, 55000, NULL, 24840, NULL),
(22, 6, NULL, 'Couleur noir', NULL, 0, '2026-10-11 11:47:18', '2026-10-11 11:50:40', NULL, NULL, NULL, NULL, NULL),
(23, 6, 22, 'Pointure  42', NULL, 1, '2026-10-11 11:47:18', '2026-10-11 12:31:09', NULL, 55000, NULL, 24840, NULL),
(24, 6, 22, 'Pointure  39', NULL, 1, '2026-10-11 11:47:18', '2026-10-11 12:31:09', NULL, 55000, NULL, 24840, NULL),
(25, 6, 20, 'Pointure  41', NULL, 1, '2026-10-11 11:47:18', '2026-10-11 12:31:09', NULL, 55000, NULL, 24840, NULL),
(26, 8, NULL, 'Couleur Rouge', NULL, 0, '2026-10-11 13:31:12', '2026-10-11 13:31:12', NULL, NULL, NULL, 3634, NULL),
(27, 8, 26, 'Iphone 13 Pro', NULL, 1, '2026-10-11 13:33:41', '2026-10-11 14:19:28', NULL, 10000, NULL, 3634, NULL),
(28, 8, 26, 'Iphone 13 Pro max', NULL, 1, '2026-10-11 13:34:08', '2026-10-11 14:19:30', NULL, 10000, NULL, 3634, NULL),
(29, 8, NULL, 'Couleur Violet', NULL, 0, '2026-10-11 13:34:37', '2026-10-11 13:34:37', NULL, NULL, NULL, 3634, NULL),
(30, 8, 29, 'Iphone 13 Pro Max', NULL, 1, '2026-10-11 13:36:27', '2026-10-11 14:19:33', NULL, 10000, NULL, 3634, NULL),
(31, 8, 29, 'Iphone 12', NULL, 1, '2026-10-11 13:37:25', '2026-10-11 14:20:00', NULL, 10000, NULL, 3634, NULL),
(32, 8, NULL, 'Couleur Noir', NULL, 0, '2026-10-11 13:37:49', '2026-10-11 13:37:49', NULL, NULL, NULL, 3634, NULL),
(33, 8, 32, 'Iphone 12', NULL, 1, '2026-10-11 13:38:46', '2026-10-11 14:19:37', NULL, 10000, NULL, 3634, NULL),
(34, 8, 32, 'Iphone 13 Pro max', NULL, 1, '2026-10-11 13:40:01', '2026-10-11 14:19:39', NULL, 10000, NULL, 3634, NULL),
(35, 8, NULL, 'Couleur Blanc', NULL, 0, '2026-10-11 13:40:47', '2026-10-11 13:40:47', NULL, NULL, NULL, 3634, NULL),
(36, 8, 35, 'Iphone 13 Pro Max', NULL, 1, '2026-10-11 13:40:56', '2026-10-11 14:19:42', NULL, 10000, NULL, 3634, NULL),
(37, 8, 35, 'Iphone 12', NULL, 1, '2026-10-11 13:41:11', '2026-10-11 14:19:54', NULL, 10000, NULL, 3634, NULL),
(38, 9, NULL, 'Iphone 13', NULL, 3, '2026-10-11 13:48:18', '2026-10-11 14:18:35', NULL, 18000, NULL, 2392, 15000),
(39, 9, NULL, 'Iphone 14', NULL, 1, '2026-10-11 13:49:04', '2026-10-11 14:18:36', NULL, 18000, NULL, 2392, 15000),
(40, 9, NULL, 'Iphone 12 Pro', NULL, 1, '2026-10-11 13:50:25', '2026-10-11 14:18:38', NULL, 18000, NULL, 2392, 15000),
(41, 9, NULL, 'Iphone 14 Pro', NULL, 2, '2026-10-11 13:50:45', '2026-10-11 14:18:40', NULL, 18000, NULL, 2392, 15000),
(42, 9, NULL, 'Iphone 12', NULL, 2, '2026-10-11 13:51:03', '2026-10-11 14:18:41', NULL, 18000, NULL, 2392, 15000),
(43, 10, NULL, 'Black-MW15', NULL, 0, '2026-10-11 13:54:34', '2026-10-11 13:54:34', NULL, NULL, NULL, NULL, NULL),
(44, 10, 43, 'For iPhone12', NULL, 1, '2026-10-11 13:54:34', '2026-10-11 14:17:09', NULL, 15000, NULL, 3450, 10000),
(45, 10, 43, 'For iPhone11', NULL, 1, '2026-10-11 13:54:34', '2026-10-11 14:17:11', NULL, 15000, NULL, 3450, 10000),
(46, 10, 43, 'FOR iPhone 13 pro max', NULL, 1, '2026-10-11 13:54:34', '2026-10-11 14:17:13', NULL, 15000, NULL, 3450, 10000),
(47, 10, 43, 'For iPhone 14 pro max', NULL, 1, '2026-10-11 13:54:34', '2026-10-11 14:17:14', NULL, 15000, NULL, 3450, 10000),
(48, 10, NULL, 'White-MW15', NULL, 0, '2026-10-11 13:54:34', '2026-10-11 14:17:23', NULL, NULL, NULL, 3450, 10000),
(49, 10, 48, 'For iPhone 13', NULL, 1, '2026-10-11 13:54:34', '2026-10-11 14:17:25', NULL, 15000, NULL, 3450, 10000),
(50, 10, 43, 'For iPhone12 pro', NULL, 1, '2026-10-11 13:54:34', '2026-10-11 14:17:16', NULL, 15000, NULL, 3450, 10000),
(51, 10, 43, 'For iPhone 16 pro', NULL, 1, '2026-10-11 13:54:34', '2026-10-11 14:17:18', NULL, 15000, NULL, 3450, 10000),
(52, 10, 48, 'For iPhone11', NULL, 1, '2026-10-11 13:54:34', '2026-10-11 14:17:27', NULL, 15000, NULL, 3450, 10000),
(53, 10, 48, 'For iPhone12 pro', NULL, 1, '2026-10-11 13:54:34', '2026-10-11 14:17:29', NULL, 15000, NULL, 3450, 10000),
(54, 10, 43, 'For iPhone 15', NULL, 1, '2026-10-11 13:54:34', '2026-10-11 14:17:20', NULL, 15000, NULL, 3450, 10000),
(55, 11, NULL, 'Couleur bleu-blanc', NULL, 0, '2026-10-11 14:05:57', '2026-10-11 14:06:15', NULL, NULL, NULL, 5888, NULL),
(56, 11, NULL, 'Couleur bleu-noir', NULL, 0, '2026-10-11 14:06:07', '2026-10-11 14:06:07', NULL, NULL, NULL, 5888, NULL),
(57, 11, NULL, 'Couleur violet-noir', NULL, 0, '2026-10-11 14:06:26', '2026-10-11 14:06:26', NULL, NULL, NULL, 5888, NULL),
(58, 11, 55, 'Iphone 13 Pro Max', NULL, 1, '2026-10-11 14:07:04', '2026-10-11 14:15:32', NULL, 11000, NULL, 5888, NULL),
(59, 11, 55, 'Iphone 13 Pro', NULL, 1, '2026-10-11 14:07:39', '2026-10-11 14:15:32', NULL, 11000, NULL, 5888, NULL),
(60, 11, 56, 'Iphone 11', NULL, 2, '2026-10-11 14:08:42', '2026-10-11 14:15:32', NULL, 11000, NULL, 5888, NULL),
(61, 11, 56, 'Iphone 14 Pro max', NULL, 1, '2026-10-11 14:09:27', '2026-10-11 14:15:32', NULL, 11000, NULL, 5888, NULL),
(62, 11, 56, 'Iphone 13 Pro max', NULL, 1, '2026-10-11 14:09:51', '2026-10-11 14:15:32', NULL, 11000, NULL, 5888, NULL),
(63, 11, 56, 'Iphone 16 Pro max', NULL, 1, '2026-10-11 14:10:04', '2026-10-11 14:15:33', NULL, 11000, NULL, 5888, NULL),
(64, 11, 56, 'Iphone 16 Pro', NULL, 1, '2026-10-11 14:10:40', '2026-10-11 14:15:33', NULL, 11000, NULL, 5888, NULL),
(65, 11, 57, 'Iphone 14 Pro max', NULL, 1, '2026-10-11 14:11:00', '2026-10-11 14:15:33', NULL, 11000, NULL, 5888, NULL),
(66, 11, 57, 'Iphone 13 Pro max', NULL, 1, '2026-10-11 14:11:12', '2026-10-11 14:15:33', NULL, 11000, NULL, 5888, NULL),
(67, 8, NULL, 'Couleur Marron', NULL, 0, '2026-10-11 14:11:53', '2026-10-11 14:11:53', NULL, NULL, NULL, 3634, NULL),
(68, 8, 67, 'Iphone 12 pro', NULL, 1, '2026-10-11 14:12:05', '2026-10-11 14:19:49', NULL, 10000, NULL, 3634, NULL),
(69, 9, NULL, 'Iphone 14 Pro max', NULL, 1, '2026-10-11 14:12:34', '2026-10-11 14:18:45', NULL, 18000, NULL, 2392, 15000),
(70, 13, NULL, 'Couleur Orange', NULL, 2, '2026-10-11 14:38:03', '2026-10-11 14:40:38', NULL, 5000, NULL, 1100, NULL),
(71, 13, NULL, 'Couleur Rouge', NULL, 2, '2026-10-11 14:38:18', '2026-10-11 14:40:40', NULL, 5000, NULL, 1100, NULL),
(72, 13, NULL, 'Couleur vert', NULL, 2, '2026-10-11 14:38:36', '2026-10-11 14:40:42', NULL, 5000, NULL, 1100, NULL),
(73, 13, NULL, 'Couleur violet', NULL, 2, '2026-10-11 14:39:01', '2026-10-11 20:23:34', NULL, 5000, NULL, 1100, NULL),
(74, 13, NULL, 'Couleur Noir', NULL, 1, '2026-10-11 14:39:33', '2026-10-11 14:40:43', NULL, 5000, NULL, 1100, NULL),
(75, 13, NULL, 'Couleur bleu', NULL, 1, '2026-10-11 14:39:46', '2026-10-11 14:40:45', NULL, 5000, NULL, 1100, NULL),
(76, 5, NULL, 'Pointure 41', NULL, 2, '2026-10-11 20:08:57', '2026-10-11 20:09:13', NULL, NULL, NULL, 18354, NULL),
(77, 4, 16, 'Pointure 40', NULL, 1, '2026-10-11 20:13:45', '2026-10-11 20:14:03', NULL, NULL, NULL, 22724, NULL),
(78, 14, NULL, 'Couleur Blanc', NULL, 18, '2026-10-11 20:44:59', '2026-10-11 20:45:52', NULL, 12000, NULL, 6000, 10000),
(79, 14, NULL, 'Couleur Noir', NULL, 26, '2026-10-11 20:45:17', '2026-10-11 20:46:05', NULL, 12000, NULL, 6000, 10000);

-- --------------------------------------------------------

--
-- Structure de la table `promo_codes`
--

CREATE TABLE `promo_codes` (
  `id` int NOT NULL,
  `code` varchar(64) COLLATE utf8mb4_general_ci NOT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `discount_type` enum('percent','fixed') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'percent',
  `discount_value` float NOT NULL DEFAULT '0',
  `min_order_amount` float DEFAULT NULL,
  `max_uses` int DEFAULT NULL,
  `used_count` int NOT NULL DEFAULT '0',
  `starts_at` datetime DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `receipts`
--

CREATE TABLE `receipts` (
  `id` int NOT NULL,
  `receipt_number` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `seller` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `currency` varchar(10) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `items_count` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `photo` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `receipts`
--

INSERT INTO `receipts` (`id`, `receipt_number`, `file_name`, `seller`, `currency`, `items_count`, `user_id`, `created_at`, `updated_at`, `deleted_at`, `photo`) VALUES
(1, '307837942001020665', 'Receipt_307837942001020665_1790849093484.pdf', 'Wenzhou Jikexing Trading Co., Ltd.', 'USD', 1, 1, '2026-10-11 08:15:23', '2026-10-11 08:15:23', NULL, NULL),
(2, '306863463001020665', 'Receipt_306863463001020665_1790847787146.pdf', 'Shijiazhuang Hengzhuo Technology Co., Ltd.', 'USD', 1, 1, '2026-10-11 10:43:32', '2026-10-11 10:43:32', NULL, NULL),
(3, '306558875501020665', 'Receipt_306558875501020665_1790849364683_receipt8.pdf', 'Ruian Kuanghong Shoes Co., Ltd.', 'USD', 2, 1, '2026-10-11 10:51:06', '2026-10-11 10:51:06', NULL, NULL),
(4, '307711814001020665', 'Receipt_307711814001020665_1790852192176_beige.pdf', 'Wenzhou Better Outdoor Products Co., Ltd.', 'USD', 1, 1, '2026-10-11 10:58:27', '2026-10-11 10:58:27', NULL, NULL),
(5, '306551503501020665', 'Receipt_306551503501020665_1790852472202_dernier.pdf', 'Wenzhou Lingmo Trading Co., Ltd.', 'USD', 1, 1, '2026-10-11 11:19:56', '2026-10-11 11:19:56', NULL, NULL),
(6, '306550159501020665', 'Receipt_306550159501020665_1790852788682_final_product.pdf', 'Wenzhou Sipcope Trading Co., Ltd.', 'USD', 4, 1, '2026-10-11 11:47:18', '2026-10-11 11:47:18', NULL, NULL),
(7, '307713522001020665', 'Receipt_307713522001020665_1790851750594_vilany.pdf', 'Jinhua Qi\'ancheng Trading Co., Ltd.', 'USD', 1, 1, '2026-10-11 11:54:12', '2026-10-11 11:54:12', NULL, NULL),
(8, '307498410501020665', 'candy.pdf', 'Shenzhen L&y Technology Co., Ltd.', 'USD', 1, 1, '2026-10-11 13:25:05', '2026-10-11 13:25:05', NULL, NULL),
(9, '307594026001020665', 'Receipt_307594026001020665_1790854029874_housse_semi_transparent.pdf', 'Shenzhen Hongchangyu Electronic Co., Ltd.', 'USD', 1, 1, '2026-10-11 13:44:46', '2026-10-11 13:44:46', NULL, NULL),
(10, '307580118001020665', 'multy.pdf', 'Jiexi County Mianhu Mowang Plastic Products', 'USD', 10, 1, '2026-10-11 13:54:34', '2026-10-11 13:54:34', NULL, NULL),
(11, '307562386001020665', 'Receipt_307562386001020665_1790855035280_coeur.pdf', 'Shenzhen Zhenyuan Technology Co., Ltd.', 'USD', 1, 1, '2026-10-11 14:01:24', '2026-10-11 14:01:24', NULL, NULL),
(12, '306447719501020665', 'cable.pdf', 'Shenzhen Shijihuaxia Electronic Technology Co.,', 'USD', 1, 1, '2026-10-11 14:25:17', '2026-10-11 14:25:17', NULL, NULL),
(13, '308794735001020665', 'Receipt_308794735001020665_1791992394563.pdf', 'Guangzhou Kuer Automotive Supplies Co., Ltd.', 'USD', 1, 1, '2026-10-14 18:40:47', '2026-10-14 18:40:47', NULL, NULL);

-- --------------------------------------------------------

--
-- Structure de la table `roles`
--

CREATE TABLE `roles` (
  `id` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `roles`
--

INSERT INTO `roles` (`id`, `name`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 'super_admin', '2026-10-11 07:43:35', '2026-10-11 07:43:35', NULL),
(2, 'client', '2026-10-11 07:43:35', '2026-10-11 07:43:35', NULL);

-- --------------------------------------------------------

--
-- Structure de la table `stock`
--

CREATE TABLE `stock` (
  `id` int NOT NULL,
  `product_id` int DEFAULT NULL,
  `quantity` int NOT NULL,
  `reserved` tinyint(1) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `stock`
--

INSERT INTO `stock` (`id`, `product_id`, `quantity`, `reserved`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 1, 4, NULL, '2026-10-11 08:15:23', '2026-10-11 08:15:23', NULL),
(2, 2, 5, NULL, '2026-10-11 10:43:32', '2026-10-11 10:43:32', NULL),
(3, 4, 5, NULL, '2026-10-11 10:58:27', '2026-10-11 10:58:27', NULL),
(4, 5, 4, NULL, '2026-10-11 11:19:56', '2026-10-11 11:19:56', NULL),
(5, 7, 10, NULL, '2026-10-11 11:54:12', '2026-10-11 11:54:12', NULL),
(6, 8, 10, NULL, '2026-10-11 13:25:05', '2026-10-11 13:25:05', NULL),
(7, 9, 12, NULL, '2026-10-11 13:44:46', '2026-10-11 13:44:46', NULL),
(8, 11, 10, NULL, '2026-10-11 14:01:24', '2026-10-11 14:01:24', NULL),
(9, 12, 6, NULL, '2026-10-11 14:25:17', '2026-10-11 14:25:17', NULL),
(10, 15, 9, NULL, '2026-10-14 18:40:47', '2026-10-14 18:40:47', NULL),
(11, 16, 1, NULL, '2026-10-16 20:03:04', '2026-10-16 20:03:04', NULL);

-- --------------------------------------------------------

--
-- Structure de la table `stock_movements`
--

CREATE TABLE `stock_movements` (
  `id` int NOT NULL,
  `product_id` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `type` enum('in_stoct','out_stock') COLLATE utf8mb4_general_ci NOT NULL,
  `quantity` int NOT NULL,
  `stock_before` int DEFAULT NULL,
  `stock_after` int DEFAULT NULL,
  `reference` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `lot_id` int DEFAULT NULL,
  `unit_cost` float DEFAULT NULL,
  `total_cost` float DEFAULT NULL,
  `another_price` float DEFAULT '0',
  `commande_id` int DEFAULT NULL,
  `other_price_reason` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `variant_id` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `stock_movements`
--

INSERT INTO `stock_movements` (`id`, `product_id`, `user_id`, `type`, `quantity`, `stock_before`, `stock_after`, `reference`, `created_at`, `updated_at`, `deleted_at`, `lot_id`, `unit_cost`, `total_cost`, `another_price`, `commande_id`, `other_price_reason`, `variant_id`) VALUES
(1, 1, 1, 'in_stoct', 4, 0, 4, 'IMPORT-REÇU 307837942001020665 - ACHAT-20261003', '2026-10-11 08:15:23', '2026-10-11 08:15:23', NULL, 1, 17756, 87400, 16376, NULL, NULL, NULL),
(2, 1, 1, 'in_stoct', 1, 0, 1, 'Ajustement variante - Poinure 40', '2026-10-11 08:23:04', '2026-10-11 08:23:04', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1),
(3, 1, 1, 'in_stoct', 1, 0, 1, 'Ajustement variante - Poinure 41', '2026-10-11 08:23:24', '2026-10-11 08:23:24', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 2),
(4, 1, 1, 'in_stoct', 1, 0, 1, 'Ajustement variante - Poinure 42', '2026-10-11 08:23:36', '2026-10-11 08:23:36', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 3),
(5, 1, 1, 'in_stoct', 1, 0, 1, 'Ajustement variante - Poinure 43', '2026-10-11 08:23:47', '2026-10-11 08:23:47', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4),
(6, 2, 1, 'in_stoct', 5, 0, 5, 'IMPORT-REÇU 306863463001020665 - ACHAT-20261003', '2026-10-11 10:43:32', '2026-10-11 10:43:32', NULL, 1, 13800, 90022, 21022, NULL, NULL, NULL),
(7, 2, 1, 'in_stoct', 1, 0, 1, 'Ajustement variante - Pointure 39', '2026-10-11 10:48:52', '2026-10-11 10:48:52', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 5),
(8, 2, 1, 'in_stoct', 1, 0, 1, 'Ajustement variante - Pointure 40', '2026-10-11 10:48:55', '2026-10-11 10:48:55', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 6),
(9, 2, 1, 'in_stoct', 1, 0, 1, 'Ajustement variante - Pointure 41', '2026-10-11 10:48:58', '2026-10-11 10:48:58', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 7),
(10, 2, 1, 'in_stoct', 1, 0, 1, 'Ajustement variante - Pointure 42', '2026-10-11 10:49:01', '2026-10-11 10:49:01', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 8),
(11, 2, 1, 'in_stoct', 1, 0, 1, 'Ajustement variante - Pointure 43', '2026-10-11 10:49:04', '2026-10-11 10:49:04', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 9),
(12, 3, 1, 'in_stoct', 2, 0, 2, 'IMPORT-REÇU 306558875501020665 - ACHAT-20261003', '2026-10-11 10:51:06', '2026-10-11 10:51:06', NULL, 1, 20700, 47380, 5980, NULL, NULL, 11),
(13, 3, 1, 'in_stoct', 2, 0, 2, 'IMPORT-REÇU 306558875501020665 - ACHAT-20261003', '2026-10-11 10:51:06', '2026-10-11 10:51:06', NULL, 1, 20700, 47380, 5980, NULL, NULL, 13),
(14, 4, 1, 'in_stoct', 5, 0, 5, 'IMPORT-REÇU 307711814001020665 - ACHAT-20261003', '2026-10-11 10:58:27', '2026-10-11 10:58:27', NULL, 1, 22724, 131238, 17618, NULL, NULL, NULL),
(15, 4, 1, 'in_stoct', 2, 0, 2, 'Ajustement variante - Couleur gris', '2026-10-11 11:03:33', '2026-10-11 11:03:33', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 14),
(16, 4, 1, 'in_stoct', 2, 0, 2, 'Ajustement variante - Pointure 41', '2026-10-11 11:03:41', '2026-10-11 11:03:41', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 15),
(17, 4, 1, 'in_stoct', 2, 0, 2, 'Ajustement variante - Couleur beige', '2026-10-11 11:04:15', '2026-10-11 11:04:15', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 16),
(18, 4, 1, 'in_stoct', 2, 0, 2, 'Ajustement variante - Pointure 42', '2026-10-11 11:04:35', '2026-10-11 11:04:35', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 17),
(19, 5, 1, 'in_stoct', 4, 0, 4, 'IMPORT-REÇU 306551503501020665 - ACHAT-20261003', '2026-10-11 11:19:56', '2026-10-11 11:19:56', NULL, 1, 18354, 89838, 16422, NULL, NULL, NULL),
(20, 5, 1, 'in_stoct', 2, 0, 2, 'Ajustement variante - Pointure 42', '2026-10-11 11:22:08', '2026-10-11 11:22:08', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 18),
(21, 5, 1, 'in_stoct', 2, 0, 2, 'Ajustement variante - Pointure 43', '2026-10-11 11:22:19', '2026-10-11 11:22:19', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 19),
(22, 6, 1, 'in_stoct', 1, 0, 1, 'IMPORT-REÇU 306550159501020665 - ACHAT-20261003', '2026-10-11 11:47:18', '2026-10-11 11:47:18', NULL, 1, 24840, 29141, 4301, NULL, NULL, 21),
(23, 6, 1, 'in_stoct', 1, 0, 1, 'IMPORT-REÇU 306550159501020665 - ACHAT-20261003', '2026-10-11 11:47:18', '2026-10-11 11:47:18', NULL, 1, 24840, 29141, 4301, NULL, NULL, 23),
(24, 6, 1, 'in_stoct', 1, 0, 1, 'IMPORT-REÇU 306550159501020665 - ACHAT-20261003', '2026-10-11 11:47:18', '2026-10-11 11:47:18', NULL, 1, 24840, 29141, 4301, NULL, NULL, 24),
(25, 6, 1, 'in_stoct', 1, 0, 1, 'IMPORT-REÇU 306550159501020665 - ACHAT-20261003', '2026-10-11 11:47:18', '2026-10-11 11:47:18', NULL, 1, 24840, 29141, 4301, NULL, NULL, 25),
(26, 7, 1, 'in_stoct', 10, 0, 10, 'IMPORT-REÇU 307713522001020665 - ACHAT-20261003', '2026-10-11 11:54:12', '2026-10-11 11:54:12', NULL, 1, 17710, 222686, 45586, NULL, NULL, NULL),
(27, 8, 1, 'in_stoct', 10, 0, 10, 'IMPORT-REÇU 307498410501020665 - ACHAT-20260916', '2026-10-11 13:25:05', '2026-10-11 13:25:05', NULL, 2, 3634, 49312, 12972, NULL, NULL, NULL),
(28, 8, 1, 'in_stoct', 1, 0, 1, 'Ajustement variante - Iphone 13 Pro', '2026-10-11 13:33:43', '2026-10-11 13:33:43', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 27),
(29, 8, 1, 'in_stoct', 1, 0, 1, 'Ajustement variante - Iphone 13 Pro max', '2026-10-11 13:34:11', '2026-10-11 13:34:11', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 28),
(30, 8, 1, 'in_stoct', 1, 0, 1, 'Ajustement variante - Iphone 13 Pro Max', '2026-10-11 13:36:29', '2026-10-11 13:36:29', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 30),
(31, 8, 1, 'in_stoct', 1, 0, 1, 'Ajustement variante - Iphone 12', '2026-10-11 13:37:29', '2026-10-11 13:37:29', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 31),
(32, 8, 1, 'in_stoct', 1, 0, 1, 'Ajustement variante - Iphone 12', '2026-10-11 13:38:48', '2026-10-11 13:38:48', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 33),
(33, 8, 1, 'in_stoct', 1, 0, 1, 'Ajustement variante - Iphone 13 Pro max', '2026-10-11 13:40:05', '2026-10-11 13:40:05', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 34),
(34, 8, 1, 'in_stoct', 1, 0, 1, 'Ajustement variante - Iphone 13 Pro Max', '2026-10-11 13:40:59', '2026-10-11 13:40:59', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 36),
(35, 8, 1, 'in_stoct', 1, 0, 1, 'Ajustement variante - Iphone 12', '2026-10-11 13:41:15', '2026-10-11 13:41:15', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 37),
(36, 9, 1, 'in_stoct', 12, 0, 12, 'IMPORT-REÇU 307594026001020665 - ACHAT-20260916', '2026-10-11 13:44:46', '2026-10-11 13:44:46', NULL, 2, 2392, 43792, 15088, NULL, NULL, NULL),
(37, 9, 1, 'in_stoct', 3, 0, 3, 'Ajustement variante - Iphone 13', '2026-10-11 13:48:52', '2026-10-11 13:48:52', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 38),
(38, 9, 1, 'in_stoct', 1, 0, 1, 'Ajustement variante - Iphone 14', '2026-10-11 13:49:09', '2026-10-11 13:49:09', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 39),
(39, 9, 1, 'in_stoct', 1, 0, 1, 'Ajustement variante - Iphone 12 Pro', '2026-10-11 13:50:29', '2026-10-11 13:50:29', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 40),
(40, 9, 1, 'in_stoct', 2, 0, 2, 'Ajustement variante - Iphone 14 Pro', '2026-10-11 13:50:49', '2026-10-11 13:50:49', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 41),
(41, 9, 1, 'in_stoct', 2, 0, 2, 'Ajustement variante - Iphone 12', '2026-10-11 13:51:07', '2026-10-11 13:51:07', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 42),
(42, 10, 1, 'in_stoct', 1, 0, 1, 'IMPORT-REÇU 307580118001020665 - ACHAT-20260916', '2026-10-11 13:54:34', '2026-10-11 13:54:34', NULL, 2, 3450, 4255, 805, NULL, NULL, 44),
(43, 10, 1, 'in_stoct', 1, 0, 1, 'IMPORT-REÇU 307580118001020665 - ACHAT-20260916', '2026-10-11 13:54:34', '2026-10-11 13:54:34', NULL, 2, 3450, 4255, 805, NULL, NULL, 45),
(44, 10, 1, 'in_stoct', 1, 0, 1, 'IMPORT-REÇU 307580118001020665 - ACHAT-20260916', '2026-10-11 13:54:34', '2026-10-11 13:54:34', NULL, 2, 3450, 4255, 805, NULL, NULL, 46),
(45, 10, 1, 'in_stoct', 1, 0, 1, 'IMPORT-REÇU 307580118001020665 - ACHAT-20260916', '2026-10-11 13:54:34', '2026-10-11 13:54:34', NULL, 2, 3450, 4255, 805, NULL, NULL, 47),
(46, 10, 1, 'in_stoct', 1, 0, 1, 'IMPORT-REÇU 307580118001020665 - ACHAT-20260916', '2026-10-11 13:54:34', '2026-10-11 13:54:34', NULL, 2, 3450, 4255, 805, NULL, NULL, 49),
(47, 10, 1, 'in_stoct', 1, 0, 1, 'IMPORT-REÇU 307580118001020665 - ACHAT-20260916', '2026-10-11 13:54:34', '2026-10-11 13:54:34', NULL, 2, 3450, 4255, 805, NULL, NULL, 50),
(48, 10, 1, 'in_stoct', 1, 0, 1, 'IMPORT-REÇU 307580118001020665 - ACHAT-20260916', '2026-10-11 13:54:34', '2026-10-11 13:54:34', NULL, 2, 3450, 4255, 805, NULL, NULL, 51),
(49, 10, 1, 'in_stoct', 1, 0, 1, 'IMPORT-REÇU 307580118001020665 - ACHAT-20260916', '2026-10-11 13:54:34', '2026-10-11 13:54:34', NULL, 2, 3450, 4255, 805, NULL, NULL, 52),
(50, 10, 1, 'in_stoct', 1, 0, 1, 'IMPORT-REÇU 307580118001020665 - ACHAT-20260916', '2026-10-11 13:54:34', '2026-10-11 13:54:34', NULL, 2, 3450, 4255, 805, NULL, NULL, 53),
(51, 10, 1, 'in_stoct', 1, 0, 1, 'IMPORT-REÇU 307580118001020665 - ACHAT-20260916', '2026-10-11 13:54:34', '2026-10-11 13:54:34', NULL, 2, 3450, 4255, 805, NULL, NULL, 54),
(52, 11, 1, 'in_stoct', 10, 0, 10, 'IMPORT-REÇU 307562386001020665 - ACHAT-20260916', '2026-10-11 14:01:24', '2026-10-11 14:01:24', NULL, 2, 5888, 60950, 2070, NULL, NULL, NULL),
(53, 11, 1, 'in_stoct', 1, 0, 1, 'Ajustement variante - Iphone 13 Pro Max', '2026-10-11 14:07:07', '2026-10-11 14:07:07', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 58),
(54, 11, 1, 'in_stoct', 2, 0, 2, 'Ajustement variante - Iphone 11', '2026-10-11 14:09:00', '2026-10-11 14:09:00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 60),
(55, 11, 1, 'in_stoct', 1, 0, 1, 'Ajustement variante - Iphone 14 Pro max', '2026-10-11 14:09:30', '2026-10-11 14:09:30', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 61),
(56, 11, 1, 'in_stoct', 1, 0, 1, 'Ajustement variante - Iphone 13 Pro max', '2026-10-11 14:09:55', '2026-10-11 14:09:55', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 62),
(57, 11, 1, 'in_stoct', 1, 0, 1, 'Ajustement variante - Iphone 16 Pro max', '2026-10-11 14:10:08', '2026-10-11 14:10:08', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 63),
(58, 11, 1, 'in_stoct', 1, 0, 1, 'Ajustement variante - Iphone 16 Pro', '2026-10-11 14:10:43', '2026-10-11 14:10:43', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 64),
(59, 11, 1, 'in_stoct', 1, 0, 1, 'Ajustement variante - Iphone 14 Pro max', '2026-10-11 14:11:05', '2026-10-11 14:11:05', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 65),
(60, 11, 1, 'in_stoct', 1, 0, 1, 'Ajustement variante - Iphone 13 Pro max', '2026-10-11 14:11:16', '2026-10-11 14:11:16', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 66),
(61, 8, 1, 'in_stoct', 1, 0, 1, 'Ajustement variante - Iphone 12 pro', '2026-10-11 14:12:07', '2026-10-11 14:12:07', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 68),
(62, 9, 1, 'in_stoct', 1, 0, 1, 'Ajustement variante - Iphone 14 Pro max', '2026-10-11 14:12:37', '2026-10-11 14:12:37', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 69),
(63, 11, 1, 'in_stoct', 1, 0, 1, 'Ajustement variante - Iphone 13 Pro', '2026-10-11 14:14:13', '2026-10-11 14:14:13', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 59),
(64, 12, 1, 'in_stoct', 6, 0, 6, 'IMPORT-REÇU 306447719501020665 - ACHAT-20260916', '2026-10-11 14:25:17', '2026-10-11 14:25:17', NULL, 2, 1840, 21068, 10028, NULL, NULL, NULL),
(65, 13, 1, 'in_stoct', 2, 0, 2, 'Ajustement variante - Couleur Orange', '2026-10-11 14:38:07', '2026-10-11 14:38:07', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 70),
(66, 13, 1, 'in_stoct', 2, 0, 2, 'Ajustement variante - Couleur Rouge', '2026-10-11 14:38:24', '2026-10-11 14:38:24', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 71),
(67, 13, 1, 'in_stoct', 2, 0, 2, 'Ajustement variante - Couleur vert', '2026-10-11 14:38:40', '2026-10-11 14:38:40', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 72),
(68, 13, 1, 'in_stoct', 2, 0, 2, 'Ajustement variante - Couleur violet', '2026-10-11 14:39:05', '2026-10-11 14:39:05', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 73),
(69, 13, 1, 'in_stoct', 1, 0, 1, 'Ajustement variante - Couleur Noir', '2026-10-11 14:39:37', '2026-10-11 14:39:37', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 74),
(70, 13, 1, 'in_stoct', 1, 0, 1, 'Ajustement variante - Couleur bleu', '2026-10-11 14:39:49', '2026-10-11 14:39:49', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 75),
(71, 5, 1, 'in_stoct', 1, 0, 1, 'Ajustement variante - Pointure 41', '2026-10-11 20:09:01', '2026-10-11 20:09:01', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 76),
(72, 5, 1, 'in_stoct', 1, 1, 2, 'Ajustement variante - Pointure 41', '2026-10-11 20:09:13', '2026-10-11 20:09:13', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 76),
(73, 4, 1, 'in_stoct', 1, 0, 1, 'Ajustement variante - Pointure 40', '2026-10-11 20:14:03', '2026-10-11 20:14:03', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 77),
(74, 4, 1, 'out_stock', 1, 2, 1, 'Ajustement variante - Pointure 42', '2026-10-11 20:14:07', '2026-10-11 20:14:07', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 17),
(75, 1, 1, 'in_stoct', 1, 1, 2, 'Ajustement variante - Pointure 42', '2026-10-11 20:18:28', '2026-10-11 20:18:28', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 3),
(76, 4, 1, 'out_stock', 1, 2, 1, '20261011172035-708E20', '2026-10-11 20:20:48', '2026-10-11 20:20:48', NULL, NULL, 45000, 45000, 0, 1, NULL, 15),
(77, 1, 1, 'out_stock', 1, 1, 0, '20261011172035-708E20', '2026-10-11 20:20:48', '2026-10-11 20:20:48', NULL, NULL, 35000, 35000, 0, 1, NULL, 1),
(78, 2, 1, 'out_stock', 1, 1, 0, '20261011172035-708E20', '2026-10-11 20:20:48', '2026-10-11 20:20:48', NULL, NULL, 28000, 28000, 0, 1, NULL, 6),
(79, 14, 1, 'in_stoct', 18, 0, 18, 'Ajustement variante - Couleur Blanc', '2026-10-11 20:45:09', '2026-10-11 20:45:09', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 78),
(80, 14, 1, 'in_stoct', 26, 0, 26, 'Ajustement variante - Couleur Noir', '2026-10-11 20:45:29', '2026-10-11 20:45:29', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 79),
(81, 15, 1, 'in_stoct', 9, 0, 9, 'IMPORT-REÇU 308794735001020665 - ACHAT-20260916', '2026-10-14 18:40:47', '2026-10-14 18:40:47', NULL, 2, 2944, 34500, 8004, NULL, NULL, NULL),
(82, 16, 1, 'in_stoct', 1, 0, 1, 'LOT#1 - ACHAT-20261003', '2026-10-16 20:03:04', '2026-10-16 20:03:04', NULL, 1, 30000, 40000, 10000, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Structure de la table `users`
--

CREATE TABLE `users` (
  `id` int NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `hashed_password` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `role_id` int DEFAULT NULL,
  `phone_numer` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_general_ci,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `full_name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `facebook_id` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `google_id` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `icon` varchar(1024) COLLATE utf8mb4_general_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `users`
--

INSERT INTO `users` (`id`, `email`, `hashed_password`, `is_active`, `role_id`, `phone_numer`, `address`, `created_at`, `updated_at`, `deleted_at`, `full_name`, `facebook_id`, `google_id`, `icon`) VALUES
(1, 'admin@tsena.mg', '$2b$12$s5CdIokwl35T89oG9mBHs.iqkW8awStaO0AmESYvzG39Gb0KloRUu', 1, 1, '0381759193', NULL, '2026-10-11 07:43:35', '2026-10-11 07:43:35', NULL, NULL, NULL, NULL, NULL),
(2, 'henrif544@gmail.com', '$2b$12$AaFk7DUs.T8HYSBELWZmMuN.nU40i89MeLrpDWnXyf1/FLKj..1l6', 1, 2, NULL, 'henrif544@gmail.com', '2026-10-11 13:04:28', '2026-10-11 13:04:28', NULL, 'Franck HENRI', NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Structure de la table `visits`
--

CREATE TABLE `visits` (
  `id` int NOT NULL,
  `visitor_key` varchar(64) COLLATE utf8mb4_general_ci NOT NULL,
  `visit_date` date NOT NULL,
  `path` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `visits`
--

INSERT INTO `visits` (`id`, `visitor_key`, `visit_date`, `path`, `created_at`) VALUES
(1, '95311fa6-f449-421e-95ae-525c199391f6', '2026-10-11', '/', '2026-10-11 07:54:57'),
(2, 'c58df267-b941-4ce0-8b81-2d66abb5fad6', '2026-10-11', '/produit/5', '2026-10-11 11:28:41'),
(3, 'c7f534bc-cdbe-43d8-9c43-b9dcb96981c3', '2026-10-11', '/', '2026-10-11 13:02:11'),
(4, '95311fa6-f449-421e-95ae-525c199391f6', '2026-10-13', '/', '2026-10-13 18:24:10'),
(5, '95311fa6-f449-421e-95ae-525c199391f6', '2026-10-14', '/', '2026-10-14 18:46:30'),
(6, '0b9bc8f4-df1f-498d-9f12-9d81601437d5', '2026-10-14', '/', '2026-10-14 20:10:41'),
(7, '45b6f9f6-fbbd-4cdc-b63a-b83570b530e7', '2026-10-16', '/', '2026-10-16 19:58:39');

--
-- Index pour les tables déchargées
--

--
-- Index pour la table `alembic_version`
--
ALTER TABLE `alembic_version`
  ADD PRIMARY KEY (`version_num`);

--
-- Index pour la table `cart_items`
--
ALTER TABLE `cart_items`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `id` (`id`),
  ADD KEY `ix_cart_items_customer_id` (`customer_id`),
  ADD KEY `ix_cart_items_product_id` (`product_id`),
  ADD KEY `ix_cart_items_variant_id` (`variant_id`);

--
-- Index pour la table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `id` (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Index pour la table `customers`
--
ALTER TABLE `customers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `id` (`id`),
  ADD UNIQUE KEY `phone` (`phone`),
  ADD KEY `ix_customers_users_id` (`users_id`);

--
-- Index pour la table `lots`
--
ALTER TABLE `lots`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `id` (`id`);

--
-- Index pour la table `lot_expenses`
--
ALTER TABLE `lot_expenses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ix_lot_expenses_lot_id` (`lot_id`);

--
-- Index pour la table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `id` (`id`),
  ADD KEY `order_id` (`order_id`),
  ADD KEY `ix_notifications_user_id` (`user_id`);

--
-- Index pour la table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `id` (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `fk_orders_customer_id_customers` (`customer_id`),
  ADD KEY `fk_orders_promo_code_id_promo_codes` (`promo_code_id`);

--
-- Index pour la table `otp_codes`
--
ALTER TABLE `otp_codes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `id` (`id`),
  ADD KEY `ix_otp_codes_email` (`email`);

--
-- Index pour la table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `id` (`id`),
  ADD UNIQUE KEY `sku` (`sku`),
  ADD KEY `category_id` (`category_id`);

--
-- Index pour la table `product_images`
--
ALTER TABLE `product_images`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `id` (`id`),
  ADD KEY `ix_product_images_product_id` (`product_id`);

--
-- Index pour la table `product_variants`
--
ALTER TABLE `product_variants`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `id` (`id`),
  ADD KEY `ix_product_variants_parent_id` (`parent_id`),
  ADD KEY `ix_product_variants_product_id` (`product_id`);

--
-- Index pour la table `promo_codes`
--
ALTER TABLE `promo_codes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ix_promo_codes_code` (`code`);

--
-- Index pour la table `receipts`
--
ALTER TABLE `receipts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `id` (`id`),
  ADD UNIQUE KEY `ix_receipts_receipt_number` (`receipt_number`);

--
-- Index pour la table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `id` (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Index pour la table `stock`
--
ALTER TABLE `stock`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `id` (`id`),
  ADD UNIQUE KEY `ix_stock_product_id` (`product_id`);

--
-- Index pour la table `stock_movements`
--
ALTER TABLE `stock_movements`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `id` (`id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `ix_stock_movements_lot_id` (`lot_id`),
  ADD KEY `fk_stock_movements_commande_id_orders` (`commande_id`),
  ADD KEY `ix_stock_movements_variant_id` (`variant_id`);

--
-- Index pour la table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ix_users_email` (`email`),
  ADD UNIQUE KEY `ix_users_id` (`id`),
  ADD UNIQUE KEY `ix_users_phone_numer` (`phone_numer`),
  ADD UNIQUE KEY `ix_users_facebook_id` (`facebook_id`),
  ADD UNIQUE KEY `ix_users_google_id` (`google_id`),
  ADD KEY `role_id` (`role_id`);

--
-- Index pour la table `visits`
--
ALTER TABLE `visits`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `id` (`id`),
  ADD UNIQUE KEY `uq_visits_visitor_date` (`visitor_key`,`visit_date`),
  ADD KEY `ix_visits_visitor_key` (`visitor_key`),
  ADD KEY `ix_visits_visit_date` (`visit_date`);

--
-- AUTO_INCREMENT pour les tables déchargées
--

--
-- AUTO_INCREMENT pour la table `cart_items`
--
ALTER TABLE `cart_items`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT pour la table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT pour la table `customers`
--
ALTER TABLE `customers`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT pour la table `lots`
--
ALTER TABLE `lots`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT pour la table `lot_expenses`
--
ALTER TABLE `lot_expenses`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT pour la table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT pour la table `orders`
--
ALTER TABLE `orders`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT pour la table `otp_codes`
--
ALTER TABLE `otp_codes`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT pour la table `products`
--
ALTER TABLE `products`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT pour la table `product_images`
--
ALTER TABLE `product_images`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=54;

--
-- AUTO_INCREMENT pour la table `product_variants`
--
ALTER TABLE `product_variants`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=80;

--
-- AUTO_INCREMENT pour la table `promo_codes`
--
ALTER TABLE `promo_codes`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `receipts`
--
ALTER TABLE `receipts`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT pour la table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT pour la table `stock`
--
ALTER TABLE `stock`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT pour la table `stock_movements`
--
ALTER TABLE `stock_movements`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=83;

--
-- AUTO_INCREMENT pour la table `users`
--
ALTER TABLE `users`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT pour la table `visits`
--
ALTER TABLE `visits`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- Contraintes pour les tables déchargées
--

--
-- Contraintes pour la table `cart_items`
--
ALTER TABLE `cart_items`
  ADD CONSTRAINT `cart_items_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  ADD CONSTRAINT `cart_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  ADD CONSTRAINT `fk_cart_items_variant_id` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`);

--
-- Contraintes pour la table `customers`
--
ALTER TABLE `customers`
  ADD CONSTRAINT `fk_customers_users_id` FOREIGN KEY (`users_id`) REFERENCES `users` (`id`);

--
-- Contraintes pour la table `lot_expenses`
--
ALTER TABLE `lot_expenses`
  ADD CONSTRAINT `lot_expenses_ibfk_1` FOREIGN KEY (`lot_id`) REFERENCES `lots` (`id`);

--
-- Contraintes pour la table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`),
  ADD CONSTRAINT `notifications_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Contraintes pour la table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `fk_orders_customer_id_customers` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  ADD CONSTRAINT `fk_orders_promo_code_id_promo_codes` FOREIGN KEY (`promo_code_id`) REFERENCES `promo_codes` (`id`),
  ADD CONSTRAINT `orders_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Contraintes pour la table `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `products_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`);

--
-- Contraintes pour la table `product_variants`
--
ALTER TABLE `product_variants`
  ADD CONSTRAINT `product_variants_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `product_variants` (`id`),
  ADD CONSTRAINT `product_variants_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);

--
-- Contraintes pour la table `stock`
--
ALTER TABLE `stock`
  ADD CONSTRAINT `stock_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);

--
-- Contraintes pour la table `stock_movements`
--
ALTER TABLE `stock_movements`
  ADD CONSTRAINT `fk_stock_movements_commande_id_orders` FOREIGN KEY (`commande_id`) REFERENCES `orders` (`id`),
  ADD CONSTRAINT `stock_movements_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  ADD CONSTRAINT `stock_movements_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Contraintes pour la table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
