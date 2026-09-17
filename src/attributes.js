export const EMPTY_ATTRIBUTES = {
	class: '',
	ariaHidden: false,
	ariaLabel: '',
	lang: '',
};

export function normaliseClassNames( value ) {
	return value.trim().replace( /\s+/g, ' ' );
}

export function isValidClassNames( value ) {
	if ( ! value ) {
		return true;
	}

	return value
		.split( ' ' )
		.every( ( className ) =>
			/^-?[_a-zA-Z]+[_a-zA-Z0-9-]*$/.test( className )
		);
}

export function createFormatAttributes( attributes ) {
	const formatAttributes = {};
	const classNames = normaliseClassNames( attributes.class );

	if ( classNames ) {
		formatAttributes.class = classNames;
	}

	if ( attributes.ariaHidden ) {
		formatAttributes.ariaHidden = 'true';
	} else if ( attributes.ariaLabel.trim() ) {
		formatAttributes.ariaLabel = attributes.ariaLabel.trim();
	}

	if ( attributes.lang ) {
		formatAttributes.lang = attributes.lang;
	}

	return formatAttributes;
}
