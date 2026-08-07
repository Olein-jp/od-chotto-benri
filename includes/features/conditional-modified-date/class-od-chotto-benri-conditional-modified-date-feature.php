<?php
/**
 * Conditional modified date feature.
 *
 * @package OD_Chotto_Benri
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Adds a block variation whose output is hidden when post dates match.
 */
final class OD_Chotto_Benri_Conditional_Modified_Date_Feature {

	/**
	 * Marker class used as the contract between the editor and renderer.
	 *
	 * @var string
	 */
	const MARKER_CLASS = 'od-post-modified';

	/**
	 * Get the feature key.
	 *
	 * @return string
	 */
	public function get_key() {
		return 'conditional_modified_date';
	}

	/**
	 * Get the feature label.
	 *
	 * @return string
	 */
	public function get_label() {
		return __( '条件付き更新日', 'od-chotto-benri' );
	}

	/**
	 * Get the feature description.
	 *
	 * @return string
	 */
	public function get_description() {
		return __( '投稿日と更新日が異なる日付の場合だけ更新日を表示します。', 'od-chotto-benri' );
	}

	/**
	 * Register WordPress hooks.
	 *
	 * @return void
	 */
	public function register_hooks() {
		add_action( 'enqueue_block_editor_assets', array( $this, 'enqueue_editor_assets' ) );
		add_filter( 'render_block_core/group', array( $this, 'filter_group_output' ), 10, 3 );
	}

	/**
	 * Enqueue the block variation script.
	 *
	 * @return void
	 */
	public function enqueue_editor_assets() {
		$handle = 'od-chotto-benri-conditional-modified-date';

		wp_enqueue_script(
			$handle,
			OD_CHOTTO_BENRI_URL . 'assets/js/conditional-modified-date.js',
			array( 'wp-blocks', 'wp-dom-ready', 'wp-i18n' ),
			OD_CHOTTO_BENRI_VERSION,
			true
		);

		wp_set_script_translations( $handle, 'od-chotto-benri' );
	}

	/**
	 * Hide the marked group when the published and modified calendar dates match.
	 *
	 * @param string        $block_content Rendered block content.
	 * @param array         $block         Parsed block data.
	 * @param WP_Block|null $instance      Block instance.
	 * @return string
	 */
	public function filter_group_output( $block_content, $block, $instance ) {
		$class_name = isset( $block['attrs']['className'] ) ? $block['attrs']['className'] : '';

		if ( ! $this->has_marker_class( $class_name ) ) {
			return $block_content;
		}

		$post_id = $this->get_post_id( $instance );

		if ( ! $post_id ) {
			return $block_content;
		}

		$published = get_post_datetime( $post_id, 'date' );
		$modified  = get_post_datetime( $post_id, 'modified' );

		if ( ! $published || ! $modified ) {
			return $block_content;
		}

		if ( $published->format( 'Y-m-d' ) === $modified->format( 'Y-m-d' ) ) {
			return '';
		}

		return $block_content;
	}

	/**
	 * Determine whether the class list contains the feature marker.
	 *
	 * @param string $class_name Space-separated class names.
	 * @return bool
	 */
	private function has_marker_class( $class_name ) {
		$classes = preg_split( '/\s+/', trim( (string) $class_name ) );

		return in_array( self::MARKER_CLASS, $classes, true );
	}

	/**
	 * Resolve the post ID, including blocks rendered inside a Query Loop.
	 *
	 * @param WP_Block|null $instance Block instance.
	 * @return int
	 */
	private function get_post_id( $instance ) {
		if ( $instance instanceof WP_Block && ! empty( $instance->context['postId'] ) ) {
			return absint( $instance->context['postId'] );
		}

		return absint( get_the_ID() );
	}
}
