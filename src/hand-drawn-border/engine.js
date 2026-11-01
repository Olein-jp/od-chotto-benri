/** 実寸から制御点を作る決定論的な描画エンジン。 */
export const patterns = {
	natural: { amplitude: 1.3, spacing: 55, radius: 8 },
	rough: { amplitude: 3, spacing: 32, radius: 6 },
	rounded: { amplitude: 1, spacing: 60, radius: 26 },
	sketch: { amplitude: 1.8, spacing: 42, radius: 9 },
	wavy: { amplitude: 2.5, spacing: 18, radius: 9 },
};

/* eslint-disable no-bitwise -- シード付き整数乱数の演算に使用する。 */
export function seededRandom( seed ) {
	let state = 2166136261;
	for ( const char of String( seed ).slice( 0, 128 ) ) {
		state = Math.imul( state ^ char.charCodeAt( 0 ), 16777619 );
	}
	return () => {
		state += 0x6d2b79f5;
		let n = Math.imul( state ^ ( state >>> 15 ), 1 | state );
		n ^= n + Math.imul( n ^ ( n >>> 7 ), 61 | n );
		return ( ( n ^ ( n >>> 14 ) ) >>> 0 ) / 4294967296;
	};
}

/* eslint-enable no-bitwise */

export function generateBorder( {
	width,
	height,
	pattern = 'natural',
	seed = 'default',
	roughness = 1,
} ) {
	if (
		! Number.isFinite( width ) ||
		! Number.isFinite( height ) ||
		width < 16 ||
		height < 16
	) {
		return { paths: [] };
	}
	const id = Object.prototype.hasOwnProperty.call( patterns, pattern )
		? pattern
		: 'natural';
	const preset = patterns[ id ];
	const strength = [ 0.5, 1, 1.5 ].includes( roughness ) ? roughness : 1;
	const random = seededRandom( seed );
	const inset = Math.min( 10, width / 4, height / 4 );
	const radius = Math.min(
		preset.radius,
		( width - 2 * inset ) / 4,
		( height - 2 * inset ) / 4
	);
	const left = inset;
	const right = width - inset;
	const top = inset;
	const bottom = height - inset;
	const amplitude = Math.min( preset.amplitude * strength, inset - 4 );
	const f = ( n ) => Number( n.toFixed( 3 ) );
	const makePath = ( offset = 0 ) => {
		const l = left + offset,
			r = right - offset,
			t = top + offset,
			b = bottom - offset;
		let d = `M ${ f( l + radius ) } ${ f( t ) }`;
		const edge = ( x1, y1, x2, y2 ) => {
			const dx = x2 - x1,
				dy = y2 - y1;
			const length = Math.hypot( dx, dy );
			if ( length === 0 ) {
				return;
			}
			const count = Math.min(
				512,
				Math.max( 1, Math.ceil( length / preset.spacing ) )
			);
			for ( let i = 0; i < count; i++ ) {
				const a = i / count,
					z = ( i + 1 ) / count;
				const jitter =
					id === 'wavy'
						? ( i % 2 ? -1 : 1 ) *
						  amplitude *
						  ( 0.8 + random() * 0.4 )
						: ( random() * 2 - 1 ) * amplitude;
				const nx = ( -dy / length ) * jitter,
					ny = ( dx / length ) * jitter;
				d += ` C ${ f( x1 + dx * ( a + ( z - a ) / 3 ) + nx ) } ${ f(
					y1 + dy * ( a + ( z - a ) / 3 ) + ny
				) } ${ f( x1 + dx * ( z - ( z - a ) / 3 ) + nx ) } ${ f(
					y1 + dy * ( z - ( z - a ) / 3 ) + ny
				) } ${ f( x1 + dx * z ) } ${ f( y1 + dy * z ) }`;
			}
		};
		edge( l + radius, t, r - radius, t );
		d += ` Q ${ f( r ) } ${ f( t ) } ${ f( r ) } ${ f( t + radius ) }`;
		edge( r, t + radius, r, b - radius );
		d += ` Q ${ f( r ) } ${ f( b ) } ${ f( r - radius ) } ${ f( b ) }`;
		edge( r - radius, b, l + radius, b );
		d += ` Q ${ f( l ) } ${ f( b ) } ${ f( l ) } ${ f( b - radius ) }`;
		edge( l, b - radius, l, t + radius );
		d += ` Q ${ f( l ) } ${ f( t ) } ${ f( l + radius ) } ${ f( t ) } Z`;
		return d;
	};
	const paths = [ { d: makePath(), opacity: 1 } ];
	if ( id === 'sketch' ) {
		paths.push( { d: makePath( 1.7 ), opacity: 0.45 } );
	}
	return { paths };
}
