import {
	createColorPalettes,
	findPalettePreset,
} from '../../src/hand-drawn-border/palette';

const theme = [ { name: 'Theme red', slug: 'theme-red', color: '#cc0000' } ];
const custom = [ { name: 'User blue', slug: 'user-blue', color: '#0000cc' } ];
const defaults = [ { name: 'Default black', slug: 'black', color: '#000000' } ];

test( 'ユーザー色でテーマ色を置き換えず、各出自を表示する', () => {
	expect( createColorPalettes( { theme, custom, defaults } ) ).toEqual( [
		{ slug: 'theme', colors: theme },
		{ slug: 'default', colors: defaults },
		{ slug: 'custom', colors: custom },
	] );
} );
test( 'テーマが無効にした WordPress 標準パレットは表示しない', () => {
	expect(
		createColorPalettes( {
			theme,
			custom,
			defaults,
			showDefault: false,
		} ).map( ( group ) => group.slug )
	).toEqual( [ 'theme', 'custom' ] );
} );
test( '重複スラッグは WordPress と同じユーザー・テーマ・標準の優先順位で解決する', () => {
	const palettes = createColorPalettes( {
		theme: [ ...theme, { slug: 'accent', color: '#ff0000' } ],
		custom: [ ...custom, { slug: 'accent', color: '#00ff00' } ],
		defaults: [ ...defaults, { slug: 'theme-red', color: '#880000' } ],
	} );
	expect(
		palettes
			.flatMap( ( group ) => group.colors )
			.filter( ( entry ) => entry.slug === 'accent' )
	).toEqual( [ { slug: 'accent', color: '#00ff00' } ] );
	expect( palettes[ 0 ].colors ).toEqual( theme );
	expect( defaults ).toHaveLength( 1 );
} );
test( '同じ色でもクリックしたパレットのスラッグを保持する', () => {
	const sameColor = { name: 'User red', slug: 'user-red', color: '#cc0000' };
	const palettes = createColorPalettes( { theme, custom: [ sameColor ] } );
	expect( findPalettePreset( palettes, '#cc0000', 1 ) ).toEqual( sameColor );
	expect( findPalettePreset( palettes, '#cc0000', 0, 'theme-red' ) ).toEqual(
		theme[ 0 ]
	);
} );
test( '従来の平坦なパレットだけがある環境にも対応する', () => {
	expect( createColorPalettes( { legacy: theme } ) ).toEqual( [
		{ slug: 'legacy', colors: theme },
	] );
} );
test( '明示的に空にしたパレットを従来設定で復活させない', () => {
	expect(
		createColorPalettes( {
			theme: [],
			custom: [],
			defaults,
			showDefault: false,
			legacy: defaults,
		} )
	).toEqual( [] );
} );
test( '不正値と空の出自を安全に除外する', () => {
	expect(
		createColorPalettes( {
			theme: [ null, {}, { color: 7 }, ...theme ],
			custom: null,
			defaults: {},
		} )
	).toEqual( [ { slug: 'theme', colors: theme } ] );
	expect( createColorPalettes( {} ) ).toEqual( [] );
} );
test( 'クリアとプリセット外の任意色を区別する', () => {
	const palettes = createColorPalettes( { theme } );
	expect( findPalettePreset( palettes, undefined ) ).toBeNull();
	expect( findPalettePreset( palettes, '#123456' ) ).toBeNull();
	expect( findPalettePreset( palettes, '#cc0000' ) ).toEqual( theme[ 0 ] );
} );
