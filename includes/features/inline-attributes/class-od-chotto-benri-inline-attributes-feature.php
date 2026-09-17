<?php
/**
 * RichText inline attributes feature.
 *
 * @package OD_Chotto_Benri
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Adds editable attributes to selected RichText content.
 */
final class OD_Chotto_Benri_Inline_Attributes_Feature {

	/**
	 * Get the feature key.
	 *
	 * @return string
	 */
	public function get_key() {
		return 'inline_attributes';
	}

	/**
	 * Get the feature label.
	 *
	 * @return string
	 */
	public function get_label() {
		return __( 'RichText inline attributes', 'od-chotto-benri' );
	}

	/**
	 * Get the feature description.
	 *
	 * @return string
	 */
	public function get_description() {
		return __( 'Add CSS classes, accessibility attributes, and language metadata to selected RichText.', 'od-chotto-benri' );
	}

	/**
	 * Register WordPress hooks.
	 *
	 * @return void
	 */
	public function register_hooks() {
		add_action( 'enqueue_block_editor_assets', array( $this, 'enqueue_editor_assets' ) );
	}

	/**
	 * Enqueue the editor-only script.
	 *
	 * @return void
	 */
	public function enqueue_editor_assets() {
		$asset_path  = OD_CHOTTO_BENRI_PATH . 'build/index.asset.php';
		$script_path = OD_CHOTTO_BENRI_PATH . 'build/index.js';

		if ( ! file_exists( $asset_path ) || ! file_exists( $script_path ) ) {
			return;
		}

		$asset  = require $asset_path;
		$handle = 'od-chotto-benri-inline-attributes';

		wp_enqueue_script(
			$handle,
			OD_CHOTTO_BENRI_URL . 'build/index.js',
			$asset['dependencies'],
			$asset['version'],
			true
		);

		wp_set_script_translations(
			$handle,
			'od-chotto-benri',
			OD_CHOTTO_BENRI_PATH . 'languages'
		);
	}
}
