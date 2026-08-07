( function ( blocks, domReady, i18n ) {
	'use strict';

	var markerClass = 'od-post-modified';
	var variationName = 'od-chotto-benri/conditional-modified-date';

	function hasMarkerClass( attributes ) {
		return ( attributes.className || '' )
			.split( /\s+/ )
			.includes( markerClass );
	}

	domReady( function () {
		if ( ! blocks.getBlockType( 'core/group' ) ) {
			return;
		}

		blocks.registerBlockVariation( 'core/group', {
			name: variationName,
			title: i18n.__( '条件付き更新日', 'od-chotto-benri' ),
			description: i18n.__(
				'投稿日と更新日が異なる日付の場合だけ更新日を表示します。',
				'od-chotto-benri'
			),
			icon: 'calendar-alt',
			attributes: {
				className: markerClass,
				layout: {
					type: 'flex',
					flexWrap: 'nowrap',
				},
			},
			innerBlocks: [
				[
					'core/paragraph',
					{
						content: i18n.__( '更新：', 'od-chotto-benri' ),
					},
				],
				[
					'core/post-date',
					{
						displayType: 'modified',
						metadata: {
							bindings: {
								datetime: {
									source: 'core/post-data',
									args: { field: 'modified' },
								},
							},
						},
						className: 'wp-block-post-date__modified-date',
					},
				],
			],
			scope: [ 'inserter', 'transform' ],
			isActive: hasMarkerClass,
		} );
	} );
} )( window.wp.blocks, window.wp.domReady, window.wp.i18n );
