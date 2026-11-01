import { generateBorder } from './engine';
import { resolveStyle } from './settings';

/**
 * ブロックラッパーの解決を描画処理から分離する。
 * @param {Document} document 対象文書。
 * @param {string}   clientId ブロック ID。
 */
export function resolveTarget( document, clientId ) {
	return document.getElementById( `block-${ clientId }` );
}

/**
 * 監視と描画を開始し、更新・破棄インターフェースを返す。
 * @param {HTMLElement} target  描画先。
 * @param {Object}      initial 設定。
 * @param {Function}    onReady 描画状態通知。
 */
export function mountBorder( target, initial, onReady = () => {} ) {
	const win = target.ownerDocument.defaultView;
	let attrs = initial,
		svg,
		frame,
		lastKey;
	const original = new Map(
		[ '--od-hdb-color', '--od-hdb-width' ].map( ( key ) => [
			key,
			[
				target.style.getPropertyValue( key ),
				target.style.getPropertyPriority( key ),
			],
		] )
	);
	const computed = win.getComputedStyle( target );
	const base = {
		borderTopColor: computed.borderTopColor,
		borderTopWidth: computed.borderTopWidth,
	};
	const positioned = computed.position === 'static';
	const hasBorder = [ 'Top', 'Right', 'Bottom', 'Left' ].some(
		( side ) =>
			parseFloat( computed[ `border${ side }Width` ] ) > 0 &&
			computed[ `border${ side }Style` ] !== 'none'
	);
	target.classList.add( 'od-hdb-enabled' );
	target.classList.toggle( 'od-hdb-has-border', hasBorder );
	if ( positioned ) {
		target.classList.add( 'od-hdb-positioned' );
	}
	const draw = () => {
		frame = null;
		try {
			// SVG 成功時の透明化を一時解除し、最新の標準・テーマ設定を読む。
			const wasReady = target.classList.contains( 'od-hdb-ready' );
			target.classList.remove( 'od-hdb-ready' );
			const current = win.getComputedStyle( target );
			base.borderTopColor = current.borderTopColor;
			base.borderTopWidth = current.borderTopWidth;
			if ( wasReady ) {
				target.classList.add( 'od-hdb-ready' );
			}
			const style = resolveStyle( attrs, base );
			target.style.setProperty( '--od-hdb-color', style.color );
			target.style.setProperty( '--od-hdb-width', `${ style.width }px` );
			// absolute 要素の包含ブロックに合わせ、transform の影響を受けない寸法を使う。
			const width = target.clientWidth,
				height = target.clientHeight;
			const key = JSON.stringify( [
				width,
				height,
				attrs.odHdbPattern,
				attrs.odHdbSeed,
				attrs.odHdbRoughness,
			] );
			if ( key === lastKey ) {
				return;
			}
			const result = generateBorder( {
				width,
				height,
				pattern: attrs.odHdbPattern,
				seed: attrs.odHdbSeed || 'default',
				roughness: attrs.odHdbRoughness,
			} );
			if ( ! result.paths.length ) {
				svg?.remove();
				svg = null;
				target.classList.remove( 'od-hdb-ready' );
				onReady( false );
				lastKey = key;
				return;
			}
			const next = target.ownerDocument.createElementNS(
				'http://www.w3.org/2000/svg',
				'svg'
			);
			next.setAttribute( 'class', 'od-hdb-border' );
			next.setAttribute( 'aria-hidden', 'true' );
			next.setAttribute( 'focusable', 'false' );
			next.setAttribute( 'viewBox', `0 0 ${ width } ${ height }` );
			for ( const path of result.paths ) {
				const element = target.ownerDocument.createElementNS(
					next.namespaceURI,
					'path'
				);
				element.setAttribute( 'd', path.d );
				element.setAttribute( 'opacity', path.opacity );
				next.appendChild( element );
			}
			if ( svg ) {
				svg.replaceWith( next );
			} else {
				target.appendChild( next );
			}
			svg = next;
			lastKey = key;
			target.classList.add( 'od-hdb-ready' );
			onReady( true );
		} catch {
			svg?.remove();
			svg = null;
			lastKey = null;
			target.classList.remove( 'od-hdb-ready' );
			onReady( false );
		}
	};
	const schedule = () => {
		if ( ! frame ) {
			frame = win.requestAnimationFrame( draw );
		}
	};
	const observer = win.ResizeObserver
		? new win.ResizeObserver( schedule )
		: null;
	observer?.observe( target );
	if ( ! observer ) {
		win.addEventListener( 'resize', schedule );
	}
	schedule();
	return {
		update( next ) {
			attrs = next;
			schedule();
		},
		destroy() {
			observer?.disconnect();
			win.removeEventListener( 'resize', schedule );
			if ( frame ) {
				win.cancelAnimationFrame( frame );
			}
			svg?.remove();
			target.classList.remove(
				'od-hdb-ready',
				'od-hdb-has-border',
				'od-hdb-enabled'
			);
			if ( positioned ) {
				target.classList.remove( 'od-hdb-positioned' );
			}
			for ( const [ key, [ value, priority ] ] of original ) {
				if ( value ) {
					target.style.setProperty( key, value, priority );
				} else {
					target.style.removeProperty( key );
				}
			}
		},
	};
}
