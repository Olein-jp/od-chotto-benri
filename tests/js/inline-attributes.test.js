import {
	applyFormat,
	create,
	registerFormatType,
	removeFormat,
	toHTMLString,
	unregisterFormatType,
} from '@wordpress/rich-text';

import {
	createFormatAttributes,
	isValidClassNames,
	normaliseClassNames,
} from '../../src/attributes';
import { FORMAT_CLASS_NAME, FORMAT_NAME } from '../../src/constants';

const FORMAT = {
	title: 'Inline attributes',
	tagName: 'span',
	className: FORMAT_CLASS_NAME,
	attributes: {
		class: 'class',
		ariaHidden: 'aria-hidden',
		ariaLabel: 'aria-label',
		lang: 'lang',
	},
};

beforeAll( () => {
	registerFormatType( FORMAT_NAME, FORMAT );
} );

afterAll( () => {
	unregisterFormatType( FORMAT_NAME );
} );

test( 'normalises and validates CSS class names', () => {
	expect( normaliseClassNames( ' heading-number   is-large ' ) ).toBe(
		'heading-number is-large'
	);
	expect( isValidClassNames( 'heading-number is-large' ) ).toBe( true );
	expect( isValidClassNames( 'heading-number <script>' ) ).toBe( false );
} );

test( 'does not output aria-label when aria-hidden is enabled', () => {
	expect(
		createFormatAttributes( {
			class: '',
			ariaHidden: true,
			ariaLabel: 'WordPress',
			lang: '',
		} )
	).toEqual( { ariaHidden: 'true' } );
} );

test( 'serialises the supported attributes on one span', () => {
	const value = create( { text: '01 Heading' } );
	const formatted = applyFormat(
		value,
		{
			type: FORMAT_NAME,
			attributes: {
				class: 'heading-number',
				ariaHidden: 'true',
				lang: 'en',
			},
		},
		0,
		2
	);

	expect( toHTMLString( { value: formatted } ) ).toBe(
		'<span class="od-inline-attributes heading-number" aria-hidden="true" lang="en">01</span> Heading'
	);
} );

test( 'parses existing attributes for editing', () => {
	const value = create( {
		html: '<span class="od-inline-attributes product-name" aria-label="WordPress" lang="en">WP</span>',
	} );
	const format = value.formats[ 0 ].find(
		( candidate ) => candidate.type === FORMAT_NAME
	);

	expect( format.attributes ).toEqual( {
		class: 'product-name',
		ariaLabel: 'WordPress',
		lang: 'en',
	} );
} );

test( 'updates the full existing format when the selection is collapsed', () => {
	const value = create( { text: '01 Heading' } );
	const formatted = applyFormat(
		value,
		{
			type: FORMAT_NAME,
			attributes: { class: 'heading-number', ariaHidden: 'true' },
		},
		0,
		2
	);
	const cursorInsideFormat = { ...formatted, start: 1, end: 1 };
	const updated = applyFormat( cursorInsideFormat, {
		type: FORMAT_NAME,
		attributes: { class: 'heading-number is-large', lang: 'en' },
	} );

	expect( toHTMLString( { value: updated } ) ).toBe(
		'<span class="od-inline-attributes heading-number is-large" lang="en">01</span> Heading'
	);
} );

test( 'removes the span without removing its text', () => {
	const value = create( { text: '01' } );
	const formatted = applyFormat(
		value,
		{ type: FORMAT_NAME, attributes: { ariaHidden: 'true' } },
		0,
		2
	);
	const unformatted = removeFormat( formatted, FORMAT_NAME, 0, 2 );

	expect( toHTMLString( { value: unformatted } ) ).toBe( '01' );
} );
