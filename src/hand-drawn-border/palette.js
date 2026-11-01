/**
 * パレットの入力値を、新しい配列に正規化する。
 * @param {Array|undefined} colors パレット。
 */
function normalize( colors ) {
	return Array.isArray( colors )
		? colors.filter(
				( entry ) =>
					entry &&
					typeof entry.color === 'string' &&
					entry.color.length > 0
		  )
		: [];
}

/**
 * WordPress の優先順位に従い、同じスラッグはユーザー設定で上書きする。
 * @param {Object}          settings             取得した各出自の色設定。
 * @param {Array|undefined} settings.theme       テーマの色。
 * @param {Array|undefined} settings.custom      ユーザーの色。
 * @param {Array|undefined} settings.defaults    標準の色。
 * @param {boolean}         settings.showDefault 標準色の表示許可。
 * @param {Array|undefined} settings.legacy      従来の色設定。
 * @return {Array} 出自ごとのパレット。
 */
export function createColorPalettes( {
	theme,
	custom,
	defaults,
	showDefault = true,
	legacy,
} ) {
	if ( ! [ theme, custom, defaults ].some( Array.isArray ) ) {
		const colors = normalize( legacy );
		return colors.length ? [ { slug: 'legacy', colors } ] : [];
	}
	const groups = [
		{ slug: 'default', colors: showDefault ? normalize( defaults ) : [] },
		{ slug: 'theme', colors: normalize( theme ) },
		{ slug: 'custom', colors: normalize( custom ) },
	];
	const effective = new Map();
	for ( const group of groups ) {
		for ( const entry of group.colors ) {
			if ( entry.slug ) {
				effective.set( entry.slug, { origin: group.slug, entry } );
			}
		}
	}
	const palettes = groups.map( ( group ) => ( {
		...group,
		colors: group.colors.filter(
			( entry ) =>
				! entry.slug ||
				( effective.get( entry.slug ).origin === group.slug &&
					effective.get( entry.slug ).entry === entry )
		),
	} ) );
	return [ palettes[ 1 ], palettes[ 0 ], palettes[ 2 ] ].filter(
		( group ) => group.colors.length > 0
	);
}

/**
 * 同じ色値でも、実際にクリックしたパレットのプリセットを優先する。
 * @param {Array}  palettes パレット。
 * @param {string} color    選択色。
 * @param {number} index    パレットの位置。
 * @param {string} slug     プリセットのスラッグ（提供される場合）。
 * @return {Object|null} 対応するプリセット。
 */
export function findPalettePreset( palettes, color, index, slug ) {
	if ( ! color ) {
		return null;
	}
	const entries = palettes[ index ]?.colors;
	const selected = entries?.find( ( entry ) =>
		slug ? entry.slug === slug : entry.color === color
	);
	return (
		selected ||
		palettes
			.flatMap( ( group ) => group.colors )
			.find( ( entry ) => entry.color === color ) ||
		null
	);
}
