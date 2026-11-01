import { mountBorder } from './renderer';

const mounted = new Map();
// 描画対象が DOM から外れたら監視も解除する。追加ノードの自動描画は行わない。
const removals = new window.MutationObserver( () => {
	for ( const [ target, renderer ] of mounted ) {
		if ( ! target.isConnected ) {
			renderer.destroy();
			mounted.delete( target );
		}
	}
} );
function start() {
	removals.observe( document.body, { childList: true, subtree: true } );
	for ( const target of document.querySelectorAll( '[data-od-hdb]' ) ) {
		if ( mounted.has( target ) ) {
			continue;
		}
		try {
			const attrs = JSON.parse( target.getAttribute( 'data-od-hdb' ) );
			if ( attrs.odHdbEnabled === true ) {
				mounted.set( target, mountBorder( target, attrs ) );
			}
		} catch {
			/* 不正な設定でも本文と標準ボーダーを維持する。 */
		}
	}
}
if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', start, { once: true } );
} else {
	start();
}
window.addEventListener( 'pagehide', () => {
	removals.disconnect();
	for ( const renderer of mounted.values() ) {
		renderer.destroy();
	}
	mounted.clear();
} );
window.addEventListener( 'pageshow', start );
