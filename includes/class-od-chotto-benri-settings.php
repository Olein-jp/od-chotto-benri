<?php
/**
 * Plugin settings.
 *
 * @package OD_Chotto_Benri
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Manages feature settings in wp-admin.
 */
final class OD_Chotto_Benri_Settings {

	/**
	 * Option name.
	 *
	 * @var string
	 */
	const OPTION_NAME = 'od_chotto_benri_settings';

	/**
	 * Settings page slug.
	 *
	 * @var string
	 */
	const PAGE_SLUG = 'od-chotto-benri';

	/**
	 * Feature registry.
	 *
	 * @var OD_Chotto_Benri_Feature_Registry
	 */
	private $registry;

	/**
	 * Constructor.
	 *
	 * @param OD_Chotto_Benri_Feature_Registry $registry Feature registry.
	 */
	public function __construct( OD_Chotto_Benri_Feature_Registry $registry ) {
		$this->registry = $registry;
	}

	/**
	 * Register WordPress hooks.
	 *
	 * @return void
	 */
	public function register_hooks() {
		add_action( 'admin_init', array( $this, 'register_settings' ) );
		add_action( 'admin_menu', array( $this, 'add_settings_page' ) );
	}

	/**
	 * Determine whether a feature is enabled.
	 *
	 * Missing options and newly registered features default to enabled.
	 *
	 * @param string $key Feature key.
	 * @return bool
	 */
	public function is_feature_enabled( $key ) {
		$settings = get_option( self::OPTION_NAME, array() );

		if ( ! is_array( $settings ) || ! array_key_exists( $key, $settings ) ) {
			return true;
		}

		return (bool) $settings[ $key ];
	}

	/**
	 * Register the option, section, and feature fields.
	 *
	 * @return void
	 */
	public function register_settings() {
		register_setting(
			self::PAGE_SLUG,
			self::OPTION_NAME,
			array(
				'type'              => 'array',
				'sanitize_callback' => array( $this, 'sanitize' ),
				'default'           => array(),
			)
		);

		add_settings_section(
			'od_chotto_benri_features',
			__( '利用する機能', 'od-chotto-benri' ),
			array( $this, 'render_section' ),
			self::PAGE_SLUG
		);

		foreach ( $this->registry->all() as $key => $feature ) {
			add_settings_field(
				'od_chotto_benri_' . $key,
				$feature['label'],
				array( $this, 'render_feature_field' ),
				self::PAGE_SLUG,
				'od_chotto_benri_features',
				array(
					'key'         => $key,
					'description' => $feature['description'],
				)
			);
		}
	}

	/**
	 * Sanitize feature settings.
	 *
	 * @param mixed $input Submitted settings.
	 * @return array<string, bool>
	 */
	public function sanitize( $input ) {
		$input  = is_array( $input ) ? $input : array();
		$output = array();

		foreach ( $this->registry->all() as $key => $feature ) {
			$output[ $key ] = isset( $input[ $key ] ) && '1' === (string) $input[ $key ];
		}

		return $output;
	}

	/**
	 * Add the settings page.
	 *
	 * @return void
	 */
	public function add_settings_page() {
		add_options_page(
			__( 'OD ちょっと便利', 'od-chotto-benri' ),
			__( 'OD ちょっと便利', 'od-chotto-benri' ),
			'manage_options',
			self::PAGE_SLUG,
			array( $this, 'render_page' )
		);
	}

	/**
	 * Render settings section copy.
	 *
	 * @return void
	 */
	public function render_section() {
		echo '<p>' . esc_html__( '使用する機能を選択してください。新しく追加された機能は初期状態で有効になります。', 'od-chotto-benri' ) . '</p>';
	}

	/**
	 * Render a feature checkbox.
	 *
	 * @param array<string, string> $args Field arguments.
	 * @return void
	 */
	public function render_feature_field( $args ) {
		$key = $args['key'];
		?>
		<label>
			<input
				type="checkbox"
				name="<?php echo esc_attr( self::OPTION_NAME . '[' . $key . ']' ); ?>"
				value="1"
				<?php checked( $this->is_feature_enabled( $key ) ); ?>
			/>
			<?php echo esc_html( $args['description'] ); ?>
		</label>
		<?php
	}

	/**
	 * Render the settings page.
	 *
	 * @return void
	 */
	public function render_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		?>
		<div class="wrap">
			<h1><?php echo esc_html( get_admin_page_title() ); ?></h1>
			<form action="options.php" method="post">
				<?php
				settings_fields( self::PAGE_SLUG );
				do_settings_sections( self::PAGE_SLUG );
				submit_button();
				?>
			</form>
		</div>
		<?php
	}
}
