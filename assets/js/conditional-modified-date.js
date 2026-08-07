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
			title: i18n.__( 'Conditional modified date', 'od-chotto-benri' ),
			description: i18n.__(
				'Display the modified date only when it differs from the published date.',
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
						content: i18n.__( 'Updated:', 'od-chotto-benri' ),
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
