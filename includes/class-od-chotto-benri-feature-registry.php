<?php
/**
 * Plugin feature registry.
 *
 * @package OD_Chotto_Benri
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Stores feature metadata and starts enabled features.
 */
final class OD_Chotto_Benri_Feature_Registry {

	/**
	 * Registered features.
	 *
	 * @var array<string, array<string, mixed>>
	 */
	private $features = array();

	/**
	 * Register a feature.
	 *
	 * @param string   $key         Feature key.
	 * @param string   $label       Feature label.
	 * @param string   $description Feature description.
	 * @param callable $boot        Feature boot callback.
	 * @return void
	 */
	public function register( $key, $label, $description, $boot ) {
		if ( ! is_callable( $boot ) ) {
			return;
		}

		$this->features[ $key ] = array(
			'label'       => $label,
			'description' => $description,
			'boot'        => $boot,
		);
	}

	/**
	 * Get all registered features.
	 *
	 * @return array<string, array<string, mixed>>
	 */
	public function all() {
		return $this->features;
	}

	/**
	 * Start all enabled features.
	 *
	 * @param callable $is_enabled Callback that determines whether a feature is enabled.
	 * @return void
	 */
	public function boot_enabled( $is_enabled ) {
		foreach ( $this->features as $key => $feature ) {
			if ( call_user_func( $is_enabled, $key ) ) {
				call_user_func( $feature['boot'] );
			}
		}
	}
}
