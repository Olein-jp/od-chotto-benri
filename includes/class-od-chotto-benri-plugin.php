<?php
/**
 * Main plugin coordinator.
 *
 * @package OD_Chotto_Benri
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Registers shared services and feature modules.
 */
final class OD_Chotto_Benri_Plugin {

	/**
	 * Boot the plugin.
	 *
	 * @return void
	 */
	public static function boot() {
		load_plugin_textdomain(
			'od-chotto-benri',
			false,
			dirname( plugin_basename( OD_CHOTTO_BENRI_FILE ) ) . '/languages'
		);

		$registry = new OD_Chotto_Benri_Feature_Registry();
		$feature  = new OD_Chotto_Benri_Conditional_Modified_Date_Feature();

		$registry->register(
			$feature->get_key(),
			$feature->get_label(),
			$feature->get_description(),
			array( $feature, 'register_hooks' )
		);

		$settings = new OD_Chotto_Benri_Settings( $registry );
		$settings->register_hooks();
		$registry->boot_enabled( array( $settings, 'is_feature_enabled' ) );
	}
}
