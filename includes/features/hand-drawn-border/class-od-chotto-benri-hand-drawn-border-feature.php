<?php
/**
 * 手書き風ボーダーの統合処理。
 *
 * @package OD_Chotto_Benri
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/** 手書き風ボーダー機能。 */
final class OD_Chotto_Benri_Hand_Drawn_Border_Feature {
	/**
	 * 確定した対応ブロック.
	 *
	 * @var array|null
	 */
	private $blocks;

	/**
	 * 機能の設定・連携を提供する.
	 *
	 * @return string 機能 ID。
	 */
	public function get_key() {
		return 'hand-drawn-border';
	}

	/**
	 * 機能の設定・連携を提供する.
	 *
	 * @return string 表示名。
	 */
	public function get_label() {
		return __( 'Hand-drawn border', 'od-chotto-benri' );
	}

	/**
	 * 機能の設定・連携を提供する.
	 *
	 * @return string 説明。
	 */
	public function get_description() {
		return __( 'Add hand-drawn SVG borders to container blocks.', 'od-chotto-benri' );
	}

	/**
	 * 機能の設定・連携を提供する.
	 *
	 * @return void
	 */
	public function register_hooks() {
		add_filter( 'render_block', array( $this, 'render' ), 10, 2 );
		add_action( 'enqueue_block_assets', array( $this, 'enqueue_styles' ) );
		add_action( 'enqueue_block_editor_assets', array( $this, 'enqueue_editor' ) );
	}

	/**
	 * 無効中も保存済み属性だけは維持する.
	 *
	 * @return void
	 */
	public function register_attribute_hooks() {
		add_filter( 'register_block_type_args', array( $this, 'register_attributes' ), 10, 2 );
	}

	/**
	 * 機能の設定・連携を提供する.
	 *
	 * @return array 対応ブロック。
	 */
	public function supported_blocks() {
		if ( null === $this->blocks ) {
			/** 対応ブロック名の配列を変更する。init の優先度 0 より前に登録すること。 */
			$blocks       = apply_filters( 'od_hdb_supported_blocks', array( 'core/group', 'core/columns', 'core/column', 'unitone/decorator' ) );
			$this->blocks = is_array( $blocks ) ? array_values(
				array_unique(
					array_filter(
						$blocks,
						static function ( $name ) {
							return is_string( $name ) && preg_match( '/^[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*$/D', $name );
						}
					)
				)
			) : array();
		}
		return $this->blocks;
	}

	/**
	 * 機能の設定・連携を提供する.
	 *
	 * @return array PHP・JavaScript 共通属性定義。
	 */
	public function attributes() {
		return array(
			'odHdbEnabled'   => array(
				'type'    => 'boolean',
				'default' => false,
			),
			'odHdbPattern'   => array(
				'type'    => 'string',
				'default' => 'natural',
			),
			'odHdbColor'     => array(
				'type'    => array( 'string', 'null' ),
				'default' => null,
			),
			'odHdbWidth'     => array(
				'type'    => array( 'number', 'null' ),
				'default' => null,
			),
			'odHdbRoughness' => array(
				'type'    => 'number',
				'default' => 1,
			),
			'odHdbSeed'      => array(
				'type'    => array( 'string', 'null' ),
				'default' => null,
			),
		);
	}

	/**
	 * 属性を登録する。
	 *
	 * @param array  $args 登録引数.
	 * @param string $name ブロック名.
	 * @return array
	 */
	public function register_attributes( $args, $name ) {
		if ( in_array( $name, $this->supported_blocks(), true ) ) {
			$args['attributes'] = array_merge( isset( $args['attributes'] ) ? $args['attributes'] : array(), $this->attributes() );
		}
		return $args;
	}

	/**
	 * 機能の設定・連携を提供する.
	 *
	 * @return void
	 */
	public function enqueue_styles() {
		wp_enqueue_style( 'od-hdb', OD_CHOTTO_BENRI_URL . 'assets/css/hand-drawn-border.css', array(), OD_CHOTTO_BENRI_VERSION );
	}

	/**
	 * ビルド済みスクリプトを読み込む。
	 *
	 * @param string $entry エントリー名.
	 * @return string ハンドル。
	 */
	private function enqueue_script( $entry ) {
		$handle = 'od-chotto-benri-' . $entry;
		$path   = OD_CHOTTO_BENRI_PATH . 'build/' . $entry . '.asset.php';
		if ( ! file_exists( $path ) ) {
			return '';
		}
		$asset = require $path;
		wp_enqueue_script( $handle, OD_CHOTTO_BENRI_URL . 'build/' . $entry . '.js', $asset['dependencies'], $asset['version'], true );
		return $handle;
	}

	/**
	 * 機能の設定・連携を提供する.
	 *
	 * @return void
	 */
	public function enqueue_editor() {
		$registration = 'od-hdb-register';
		wp_enqueue_script( $registration, OD_CHOTTO_BENRI_URL . 'assets/js/hand-drawn-border-register.js', array( 'wp-hooks' ), OD_CHOTTO_BENRI_VERSION, true );
		// クライアント側で最初のブロックが登録される前にフィルターを取り付ける.
		$scripts = wp_scripts();
		if ( isset( $scripts->registered['wp-blocks'] ) && ! in_array( $registration, $scripts->registered['wp-blocks']->deps, true ) ) {
			$scripts->registered['wp-blocks']->deps[] = $registration;
		}
		$handle = $this->enqueue_script( 'hand-drawn-border-editor' );
		if ( $handle ) {
			wp_add_inline_script(
				$registration,
				'window.odHdb = ' . wp_json_encode(
					array(
						'blocks'     => $this->supported_blocks(),
						'attributes' => $this->attributes(),
					)
				) . ';',
				'before'
			);
			wp_set_script_translations( $handle, 'od-chotto-benri', OD_CHOTTO_BENRI_PATH . 'languages' );
		}
	}

	/**
	 * 保存済み設定も信頼せず許可値へ正規化する.
	 *
	 * @param array $attrs ブロック属性.
	 * @return array
	 */
	public function normalize( $attrs ) {
		$pattern = $attrs['odHdbPattern'] ?? 'natural';
		$seed    = $attrs['odHdbSeed'] ?? null;
		$color   = $attrs['odHdbColor'] ?? null;
		$width   = $attrs['odHdbWidth'] ?? null;
		return array(
			'odHdbEnabled'   => true,
			'odHdbPattern'   => in_array( $pattern, array( 'natural', 'rough', 'rounded', 'sketch', 'wavy' ), true ) ? $pattern : 'natural',
			'odHdbSeed'      => is_string( $seed ) && preg_match( '/^[a-zA-Z0-9_-]{1,128}$/D', $seed ) ? $seed : null,
			'odHdbColor'     => is_string( $color ) && preg_match( '/^(?:var:preset\|color\|[a-z0-9-]+|#[a-f0-9]{3,8}|(?:rgb|hsl)a?\([0-9\s.,%\/+-]+\)|[a-z]+)$/iD', $color ) ? $color : null,
			'odHdbWidth'     => is_numeric( $width ) ? round( min( 8, max( 1, (float) $width ) ) * 2 ) / 2 : null,
			'odHdbRoughness' => in_array( $attrs['odHdbRoughness'] ?? 1, array( 0.5, 1, 1.0, 1.5 ), true ) ? (float) ( $attrs['odHdbRoughness'] ?? 1 ) : 1,
		);
	}

	/**
	 * 公開時だけルート要素に設定を付加する。保存 HTML は変更しない。
	 *
	 * @param string $html HTML.
	 * @param array  $block ブロック.
	 * @return string
	 */
	public function render( $html, $block ) {
		$attrs = isset( $block['attrs'] ) ? $block['attrs'] : array();
		if ( true !== ( $attrs['odHdbEnabled'] ?? false ) || ! in_array( $block['blockName'], $this->supported_blocks(), true ) ) {
			return $html;
		}
		$tags = new WP_HTML_Tag_Processor( $html );
		if ( ! $tags->next_tag() || ! in_array( $tags->get_tag(), array( 'DIV', 'SECTION', 'ARTICLE', 'ASIDE', 'MAIN', 'HEADER', 'FOOTER', 'NAV', 'FIGURE', 'BLOCKQUOTE', 'UL', 'OL', 'LI', 'P' ), true ) ) {
			return $html;
		}
		// 既知の属性だけを渡し、描画側でも値を検証する.
		$config                = $this->normalize( $attrs );
		$config['style']       = isset( $attrs['style']['border'] ) && is_array( $attrs['style']['border'] ) ? $attrs['style']['border'] : array();
		$config['borderColor'] = isset( $attrs['borderColor'] ) && is_string( $attrs['borderColor'] ) ? $attrs['borderColor'] : null;
		$tags->add_class( 'od-hdb-enabled' );
		$border = $config['style'];
		$global = wp_get_global_styles( array( 'border' ), array( 'block_name' => $block['blockName'] ) );
		if ( ! empty( $border['width'] ) || ! empty( $border['top']['width'] ) || ! empty( $global['width'] ) ) {
			$tags->add_class( 'od-hdb-has-border' );
		}
		$css = '';
		if ( null !== $config['odHdbWidth'] ) {
			$css .= '--od-hdb-width:' . $config['odHdbWidth'] . 'px;';
		}
		if ( null !== $config['odHdbColor'] ) {
			$color = preg_replace( '/^var:preset\|color\|([a-z0-9-]+)$/', 'var(--wp--preset--color--$1)', $config['odHdbColor'] );
			$css  .= '--od-hdb-color:' . $color . ';';
		}
		if ( $css ) {
			$tags->set_attribute( 'style', rtrim( (string) $tags->get_attribute( 'style' ), ';' ) . ';' . $css );
		}
		$tags->set_attribute( 'data-od-hdb', wp_json_encode( $config ) );
		$this->enqueue_script( 'hand-drawn-border-view' );
		return $tags->get_updated_html();
	}
}
