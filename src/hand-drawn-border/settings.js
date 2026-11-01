/**
 * CSS に渡す値を制限し、テーマ色は変数として保持する。
 * @param {string|null} value 色。
 */
export function safeColor( value ) {
	if ( typeof value !== 'string' ) {
		return null;
	}
	if ( /^var:preset\|color\|[a-z0-9-]+$/.test( value ) ) {
		return `var(--wp--preset--color--${ value.split( '|' )[ 2 ] })`;
	}
	return /^(#[a-f0-9]{3,8}|(?:rgb|hsl)a?\([\d\s.,%/+-]+\)|[a-z]+|var\(--wp--preset--color--[a-z0-9-]+\))$/i.test(
		value
	)
		? value
		: null;
}
export function resolveStyle( attrs, computed ) {
	const border = attrs.style?.border || attrs.style || {};
	const explicit =
		typeof attrs.odHdbWidth === 'number' &&
		Number.isFinite( attrs.odHdbWidth )
			? Math.round( Math.min( 8, Math.max( 1, attrs.odHdbWidth ) ) * 2 ) /
			  2
			: null;
	const standard = border.width ?? border.top?.width;
	const standardWidth =
		typeof standard === 'number' || /^\d+(\.\d+)?px$/.test( standard )
			? parseFloat( standard )
			: 0;
	const inheritedWidth = parseFloat( computed.borderTopWidth );
	const color =
		safeColor( attrs.odHdbColor ) ||
		safeColor( border.color ?? border.top?.color ) ||
		( typeof attrs.borderColor === 'string' &&
		/^[a-z0-9-]+$/.test( attrs.borderColor )
			? `var(--wp--preset--color--${ attrs.borderColor })`
			: null ) ||
		computed.borderTopColor ||
		'currentColor';
	let width = 2;
	if ( inheritedWidth > 0 ) {
		width = inheritedWidth;
	}
	if ( standardWidth > 0 ) {
		width = standardWidth;
	}
	return { color, width: explicit ?? width };
}
