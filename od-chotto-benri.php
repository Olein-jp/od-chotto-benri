<?php
/**
 * Plugin Name:       OD Chotto Benri
 * Description:       A collection of small features that make WordPress a little more convenient.
 * Version:           0.2.0
 * Requires at least: 6.5
 * Requires PHP:      7.4
 * Update URI:        https://github.com/Olein-jp/od-chotto-benri
 * Author:            Koji Kuno
 * Author URI:        https://olein-design.com
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       od-chotto-benri
 * Domain Path:       /languages
 *
 * @package OD_Chotto_Benri
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'OD_CHOTTO_BENRI_VERSION', '0.2.0' );
define( 'OD_CHOTTO_BENRI_FILE', __FILE__ );
define( 'OD_CHOTTO_BENRI_PATH', plugin_dir_path( __FILE__ ) );
define( 'OD_CHOTTO_BENRI_URL', plugin_dir_url( __FILE__ ) );

$od_chotto_benri_autoload = __DIR__ . '/vendor/autoload.php';

if ( file_exists( $od_chotto_benri_autoload ) ) {
	require_once $od_chotto_benri_autoload;
}

if ( class_exists( '\Inc2734\WP_GitHub_Plugin_Updater\Bootstrap' ) ) {
	new \Inc2734\WP_GitHub_Plugin_Updater\Bootstrap(
		plugin_basename( OD_CHOTTO_BENRI_FILE ),
		'Olein-jp',
		'od-chotto-benri',
		array(
			'homepage'     => 'https://github.com/Olein-jp/od-chotto-benri',
			'requires'     => '6.5',
			'requires_php' => '7.4',
		)
	);
}

require_once OD_CHOTTO_BENRI_PATH . 'includes/class-od-chotto-benri-feature-registry.php';
require_once OD_CHOTTO_BENRI_PATH . 'includes/class-od-chotto-benri-settings.php';
require_once OD_CHOTTO_BENRI_PATH . 'includes/features/conditional-modified-date/class-od-chotto-benri-conditional-modified-date-feature.php';
require_once OD_CHOTTO_BENRI_PATH . 'includes/class-od-chotto-benri-plugin.php';

add_action( 'init', array( 'OD_Chotto_Benri_Plugin', 'boot' ) );
