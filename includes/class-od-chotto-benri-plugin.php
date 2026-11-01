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

		// OFF 中の再保存でも既存のボーダー属性を保持する.
		$hand_drawn_border = new OD_Chotto_Benri_Hand_Drawn_Border_Feature();
		$hand_drawn_border->register_attribute_hooks();
		$registry = new OD_Chotto_Benri_Feature_Registry();
		$features = array(
			new OD_Chotto_Benri_Conditional_Modified_Date_Feature(),
			new OD_Chotto_Benri_Inline_Attributes_Feature(),
			$hand_drawn_border,
		);

		foreach ( $features as $feature ) {
			$registry->register(
				$feature->get_key(),
				$feature->get_label(),
				$feature->get_description(),
				array( $feature, 'register_hooks' )
			);
		}

		$settings = new OD_Chotto_Benri_Settings( $registry );
		$settings->register_hooks();
		$registry->boot_enabled( array( $settings, 'is_feature_enabled' ) );
	}
}
