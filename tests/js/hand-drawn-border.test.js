import {
	generateBorder,
	patterns,
	seededRandom,
} from '../../src/hand-drawn-border/engine';
import { resolveStyle, safeColor } from '../../src/hand-drawn-border/settings';
import { mountBorder } from '../../src/hand-drawn-border/renderer';

const sizes = [
	[ 320, 320 ],
	[ 600, 200 ],
	[ 200, 600 ],
	[ 1000, 200 ],
	[ 200, 1000 ],
	[ 1200, 120 ],
	[ 120, 800 ],
];
for ( const pattern of Object.keys( patterns ) ) {
	test.each( sizes )(
		`${ pattern }: %i × %i は再現可能で描画範囲内`,
		( width, height ) => {
			const options = {
				width,
				height,
				pattern,
				seed: 'fixed',
				roughness: 1.5,
			};
			const result = generateBorder( options );
			expect( result ).toEqual( generateBorder( options ) );
			expect( result.paths ).toHaveLength( pattern === 'sketch' ? 2 : 1 );
			for ( const path of result.paths ) {
				expect( path.d ).not.toMatch( /NaN|Infinity/ );
				const coordinates = path.d
					.match( /-?\d+(?:\.\d+)?/g )
					.map( Number );
				coordinates.forEach( ( value, index ) => {
					expect( value ).toBeGreaterThanOrEqual( 0 );
					expect( value ).toBeLessThanOrEqual(
						index % 2 ? height : width
					);
				} );
			}
		}
	);
}
test( 'シードと揺らぎが形状を変え、乱数列を再現する', () => {
	const a = seededRandom( 'same' ),
		b = seededRandom( 'same' );
	expect( Array.from( { length: 10 }, a ) ).toEqual(
		Array.from( { length: 10 }, b )
	);
	const base = { width: 600, height: 200, seed: 'first' };
	expect( generateBorder( base ) ).not.toEqual(
		generateBorder( { ...base, seed: 'second' } )
	);
	expect( generateBorder( base ) ).not.toEqual(
		generateBorder( { ...base, roughness: 0.5 } )
	);
} );
test.each( [ 0, -1, 1, 15, NaN, Infinity ] )(
	'無効・極小寸法 %s は安全に省略する',
	( width ) => {
		expect( generateBorder( { width, height: 100 } ).paths ).toEqual( [] );
	}
);
test( '不正パターンと揺らぎは既定値へ戻す', () => {
	expect(
		generateBorder( {
			width: 100,
			height: 100,
			pattern: '__proto__',
			roughness: 100,
		} )
	).toEqual( generateBorder( { width: 100, height: 100 } ) );
} );
test( 'テーマ色、明示値、標準値、CSS、既定値を解決する', () => {
	const computed = { borderTopColor: 'rgb(1, 2, 3)', borderTopWidth: '3px' };
	expect(
		resolveStyle(
			{
				odHdbColor: 'var:preset|color|accent',
				odHdbWidth: 4.5,
				style: { border: { width: '6px', color: '#fff' } },
			},
			computed
		)
	).toEqual( { color: 'var(--wp--preset--color--accent)', width: 4.5 } );
	expect(
		resolveStyle(
			{ style: { border: { width: '6px', color: '#fff' } } },
			computed
		)
	).toEqual( { color: '#fff', width: 6 } );
	expect( resolveStyle( {}, computed ) ).toEqual( {
		color: 'rgb(1, 2, 3)',
		width: 3,
	} );
	expect( resolveStyle( {}, {} ).width ).toBe( 2 );
	expect( resolveStyle( { odHdbWidth: 999 }, computed ).width ).toBe( 8 );
	expect( safeColor( 'red; background:url(evil)' ) ).toBeNull();
	expect( safeColor( '<svg onload=evil>' ) ).toBeNull();
} );

test( '50 要素を描画し、色変更ではパスを維持し、監視と装飾を破棄する', () => {
	const callbacks = new Map();
	let id = 0;
	window.requestAnimationFrame = jest.fn( ( callback ) => {
		callbacks.set( ++id, callback );
		return id;
	} );
	window.cancelAnimationFrame = jest.fn( ( key ) => callbacks.delete( key ) );
	const disconnect = jest.fn();
	window.ResizeObserver = jest.fn( function () {
		this.observe = jest.fn();
		this.disconnect = disconnect;
	} );
	const flush = () => {
		const pending = [ ...callbacks.values() ];
		callbacks.clear();
		pending.forEach( ( callback ) => callback() );
	};
	const targets = Array.from( { length: 50 }, () => {
		const target = document.createElement( 'div' );
		Object.defineProperties( target, {
			clientWidth: { value: 600 },
			clientHeight: { value: 200 },
		} );
		target.style.border = '3px solid red';
		document.body.appendChild( target );
		return target;
	} );
	const renderers = targets.map( ( target ) =>
		mountBorder( target, { odHdbEnabled: true, odHdbSeed: 'same' } )
	);
	flush();
	expect( document.querySelectorAll( '.od-hdb-border' ) ).toHaveLength( 50 );
	expect( window.ResizeObserver ).toHaveBeenCalledTimes( 50 );
	const svg = targets[ 0 ].querySelector( 'svg' );
	renderers[ 0 ].update( {
		odHdbSeed: 'same',
		odHdbColor: '#fff',
		odHdbWidth: 8,
	} );
	flush();
	expect( targets[ 0 ].querySelector( 'svg' ) ).toBe( svg );
	expect( targets[ 0 ].style.getPropertyValue( '--od-hdb-width' ) ).toBe(
		'8px'
	);
	for ( const renderer of renderers ) {
		renderer.destroy();
	}
	expect( disconnect ).toHaveBeenCalledTimes( 50 );
	expect( document.querySelectorAll( '.od-hdb-border' ) ).toHaveLength( 0 );
	expect( targets[ 0 ].classList.contains( 'od-hdb-ready' ) ).toBe( false );
	expect( targets[ 0 ].style.border ).toBe( '3px solid red' );
	targets.forEach( ( target ) => target.remove() );
} );
