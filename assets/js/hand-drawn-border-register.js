/* 対応一覧と属性定義は PHP から受け取る。wp-blocks より先に実行する。 */
( function () {
	'use strict';
	const config = window.odHdb;
	if ( ! config ) {
		return;
	}
	wp.hooks.addFilter(
		'blocks.registerBlockType',
		'od-hdb/attributes',
		function ( settings, name ) {
			if ( config.blocks.includes( name ) ) {
				return Object.assign( {}, settings, {
					attributes: Object.assign(
						{},
						settings.attributes,
						config.attributes
					),
				} );
			}
			return settings;
		}
	);
} )();
