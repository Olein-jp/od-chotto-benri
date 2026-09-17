import { __ } from '@wordpress/i18n';
import { registerFormatType } from '@wordpress/rich-text';

import { FORMAT_CLASS_NAME, FORMAT_NAME } from './constants';
import Edit from './edit';

registerFormatType( FORMAT_NAME, {
	title: __( 'Inline attributes', 'od-chotto-benri' ),
	tagName: 'span',
	className: FORMAT_CLASS_NAME,
	attributes: {
		class: 'class',
		ariaHidden: 'aria-hidden',
		ariaLabel: 'aria-label',
		lang: 'lang',
	},
	edit: Edit,
} );
