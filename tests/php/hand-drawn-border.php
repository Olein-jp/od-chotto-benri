<?php
/**
 * WP-CLI eval-file で実行する統合検証。
 *
 * @package OD_Chotto_Benri
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$od_hdb_feature = new OD_Chotto_Benri_Hand_Drawn_Border_Feature();
$od_hdb_count   = 0;
$od_hdb_check   = static function ( $condition, $message ) use ( &$od_hdb_count ) {
	if ( ! $condition ) {
		throw new RuntimeException( esc_html( $message ) );
	}
	++$od_hdb_count;
};
$od_hdb_check( array( 'core/group', 'core/columns', 'core/column' ) === $od_hdb_feature->supported_blocks(), '標準ブロック' );
foreach ( array(
	array( 'my-plugin/card', 'my-plugin/box', 'my-plugin/card', null, 1, 'invalid', 'UPPER/name' ),
	array(),
	'broken',
	array( 'core/group', 'missing/block' ),
	array( 'core/column' ),
) as $od_hdb_input ) {
	$od_hdb_filter = static function () use ( $od_hdb_input ) {
		return $od_hdb_input;
	};
	add_filter( 'od_hdb_supported_blocks', $od_hdb_filter );
	$od_hdb_custom = new OD_Chotto_Benri_Hand_Drawn_Border_Feature();
	$od_hdb_list   = $od_hdb_custom->supported_blocks();
	$od_hdb_check( is_array( $od_hdb_list ), '戻り値は配列' );
	$od_hdb_check( count( $od_hdb_list ) === count( array_unique( $od_hdb_list ) ), '重複除去' );
	foreach ( $od_hdb_list as $od_hdb_name ) {
		$od_hdb_check( isset( $od_hdb_custom->register_attributes( array(), $od_hdb_name )['attributes']['odHdbEnabled'] ), '追加・未登録ブロックの属性' );
	}
	$od_hdb_check( ! isset( $od_hdb_custom->register_attributes( array(), 'excluded/block' )['attributes'] ), '除外ブロック' );
	remove_filter( 'od_hdb_supported_blocks', $od_hdb_filter );
}
foreach ( $od_hdb_feature->supported_blocks() as $od_hdb_name ) {
	$od_hdb_type = WP_Block_Type_Registry::get_instance()->get_registered( $od_hdb_name );
	$od_hdb_check( isset( $od_hdb_type->attributes['odHdbEnabled'] ), '初期化がコア登録より早い' );
}
$od_hdb_attrs = array(
	'odHdbEnabled' => true,
	'odHdbPattern' => 'sketch',
	'odHdbSeed'    => 'fixed-seed',
	'odHdbColor'   => 'var:preset|color|accent',
	'odHdbWidth'   => 4.5,
);
$od_hdb_html  = '<div class="wp-block-group"><p>本文</p></div>';
$od_hdb_block = array(
	'blockName' => 'core/group',
	'attrs'     => $od_hdb_attrs,
);
$od_hdb_out   = $od_hdb_feature->render( $od_hdb_html, $od_hdb_block );
$od_hdb_tags  = new WP_HTML_Tag_Processor( $od_hdb_out );
$od_hdb_tags->next_tag();
$od_hdb_data = json_decode( $od_hdb_tags->get_attribute( 'data-od-hdb' ), true );
$od_hdb_check( 'sketch' === $od_hdb_data['odHdbPattern'], '公開設定' );
$od_hdb_check( false !== strpos( $od_hdb_out, '<p>本文</p>' ), '本文保持' );
$od_hdb_check( false === strpos( $od_hdb_out, '<svg' ), 'SVG は保存しない' );
$od_hdb_source = '<!-- wp:group ' . wp_json_encode( $od_hdb_attrs ) . ' -->' . $od_hdb_html . '<!-- /wp:group -->';
$od_hdb_parsed = parse_blocks( serialize_blocks( parse_blocks( $od_hdb_source ) ) );
$od_hdb_check( $od_hdb_attrs === $od_hdb_parsed[0]['attrs'], '保存・再読込・複製用の属性保持' );
$od_hdb_block['attrs']['odHdbEnabled'] = false;
$od_hdb_check( $od_hdb_html === $od_hdb_feature->render( $od_hdb_html, $od_hdb_block ), 'ブロック OFF' );
$od_hdb_block['attrs']['odHdbEnabled'] = true;
$od_hdb_block['blockName']             = 'core/paragraph';
$od_hdb_check( $od_hdb_html === $od_hdb_feature->render( $od_hdb_html, $od_hdb_block ), '対象外は非干渉' );
$od_hdb_invalid = $od_hdb_feature->normalize(
	array(
		'odHdbPattern'   => '<svg>',
		'odHdbColor'     => 'red; background:url(evil)',
		'odHdbSeed'      => '<script>',
		'odHdbWidth'     => 100,
		'odHdbRoughness' => 99,
	)
);
$od_hdb_check( 'natural' === $od_hdb_invalid['odHdbPattern'] && null === $od_hdb_invalid['odHdbColor'] && null === $od_hdb_invalid['odHdbSeed'] && 8.0 === $od_hdb_invalid['odHdbWidth'] && 1 === $od_hdb_invalid['odHdbRoughness'], '不正設定を正規化' );
$od_hdb_registry = new OD_Chotto_Benri_Feature_Registry();
$od_hdb_registry->register( 'hand-drawn-border', 'test', 'test', static function () {} );
$od_hdb_settings = new OD_Chotto_Benri_Settings( $od_hdb_registry );
$od_hdb_check( array( 'hand-drawn-border' => false ) === $od_hdb_settings->sanitize( array() ), 'オプション OFF の保存' );
$od_hdb_check( array( 'hand-drawn-border' => true ) === $od_hdb_settings->sanitize( array( 'hand-drawn-border' => '1' ) ), 'オプション ON の保存' );
WP_CLI::success( $od_hdb_count . ' 件の統合検証が通過しました。' );
