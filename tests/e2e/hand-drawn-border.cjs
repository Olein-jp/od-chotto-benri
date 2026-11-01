/* 検証専用サイトを対象に実行する。OD_HDB_URL で URL を指定できる。 */
const { chromium, firefox, webkit } = require( '@playwright/test' );
const fs = require( 'node:fs' );
const base = process.env.OD_HDB_URL || 'http://localhost:18945';
const output = process.env.OD_HDB_OUTPUT || '/tmp/od-hdb-browser-results';
fs.mkdirSync( output, { recursive: true } );
const check = ( value, message ) => {
	if ( ! value ) {
		throw new Error( message );
	}
};
( async () => {
	const results = [];
	for ( const [ name, type ] of Object.entries( {
		chromium,
		firefox,
		webkit,
	} ) ) {
		const browser = await type.launch( {
			headless: true,
			...( process.env[ `OD_HDB_${ name.toUpperCase() }` ]
				? {
						executablePath:
							process.env[ `OD_HDB_${ name.toUpperCase() }` ],
				  }
				: {} ),
		} );
		const page = await browser.newPage( {
			viewport: { width: 1440, height: 1000 },
		} );
		const errors = [];
		page.on( 'pageerror', ( error ) => errors.push( error.message ) );
		await page.goto( `${ base }/wp-login.php` );
		await page.locator( '#user_login' ).fill( 'admin' );
		await page.locator( '#user_pass' ).fill( 'password' );
		await Promise.all( [
			page.waitForURL( /wp-admin/ ),
			page.locator( '#wp-submit' ).click(),
		] );
		await page.goto( `${ base }/wp-admin/post-new.php` );
		await page.waitForFunction(
			() =>
				window.wp?.blocks &&
				window.wp?.data?.select( 'core/block-editor' )
		);
		await page.waitForFunction(
			() =>
				wp.blocks.getBlockType( 'core/group' )?.attributes.odHdbEnabled
		);
		await page.evaluate( () => {
			if (
				wp.data
					.select( 'core/edit-post' )
					?.isFeatureActive( 'welcomeGuide' )
			) {
				wp.data
					.dispatch( 'core/edit-post' )
					.toggleFeature( 'welcomeGuide' );
			}
		} );
		const id = await page.evaluate( () => {
			const block = wp.blocks.createBlock(
				'core/group',
				{
					odHdbEnabled: true,
					odHdbPattern: 'sketch',
					odHdbSeed: 'browser-fixed',
					odHdbColor: '#315f57',
					odHdbWidth: 3,
					style: {
						spacing: {
							padding: {
								top: '30px',
								right: '30px',
								bottom: '30px',
								left: '30px',
							},
						},
						border: {
							color: '#cc0000',
							width: '4px',
							style: 'solid',
						},
					},
				},
				[
					wp.blocks.createBlock( 'core/paragraph', {
						content: '手書き風ボーダーの確認',
					} ),
				]
			);
			wp.data.dispatch( 'core/block-editor' ).resetBlocks( [ block ] );
			wp.data
				.dispatch( 'core/editor' )
				.editPost( { title: '手書き風ボーダー検証', status: 'draft' } );
			return block.clientId;
		} );
		// iframe 内も同じ描画エンジンで装飾されること。
		const findPreview = async () => {
			for ( const frame of page.frames() ) {
				if (
					await frame
						.locator( `#block-${ id }.od-hdb-ready > svg` )
						.count()
				) {
					return frame;
				}
			}
			return null;
		};
		let preview;
		for ( let i = 0; i < 60; i++ ) {
			preview = await findPreview();
			if ( preview ) {
				break;
			}
			await page.waitForTimeout( 100 );
		}
		check( preview, `${ name }: 編集画面の SVG が見つからない` );
		await page.waitForTimeout( 250 );
		check(
			await preview
				.locator( `#block-${ id }` )
				.evaluate(
					( element ) =>
						window.getComputedStyle( element ).borderTopColor ===
						'rgba(0, 0, 0, 0)'
				),
			`${ name }: 編集画面の標準ボーダー抑制`
		);
		await preview
			.locator( `#block-${ id }` )
			.screenshot( { path: `${ output }/${ name }-editor.png` } );
		const postId = await page.evaluate( async () => {
			await wp.data.dispatch( 'core/editor' ).savePost();
			return wp.data.select( 'core/editor' ).getCurrentPostId();
		} );
		await page.reload();
		await page.waitForFunction(
			() => wp.data?.select( 'core/block-editor' )?.getBlocks().length
		);
		const saved = await page.evaluate( () => {
			const blocks = wp.data.select( 'core/block-editor' ).getBlocks();
			return {
				attrs: blocks[ 0 ].attributes,
				valid: blocks.every( ( block ) => block.isValid ),
				content: wp.blocks.serialize( blocks ),
			};
		} );
		check(
			saved.valid && saved.attrs.odHdbSeed === 'browser-fixed',
			`${ name }: 保存・復元失敗`
		);
		check(
			! saved.content.includes( '<svg' ),
			`${ name }: SVG が本文へ保存されている`
		);
		const reloadedId = await page.evaluate(
			() =>
				wp.data.select( 'core/block-editor' ).getBlocks()[ 0 ].clientId
		);
		let reloadedFrame;
		for ( let i = 0; i < 60; i++ ) {
			for ( const frame of page.frames() ) {
				if (
					await frame
						.locator(
							`#block-${ reloadedId }.od-hdb-enabled.od-hdb-ready > svg`
						)
						.count()
				) {
					reloadedFrame = frame;
					break;
				}
			}
			if ( reloadedFrame ) {
				break;
			}
			await page.waitForTimeout( 100 );
		}
		check( reloadedFrame, `${ name }: 再編集時のプレビュー` );
		await page.evaluate(
			( clientId ) =>
				wp.data
					.dispatch( 'core/block-editor' )
					.updateBlockAttributes( clientId, { odHdbEnabled: false } ),
			reloadedId
		);
		await reloadedFrame
			.locator( `#block-${ reloadedId } > svg` )
			.waitFor( { state: 'detached' } );
		check(
			( await reloadedFrame
				.locator( `#block-${ reloadedId } > svg` )
				.count() ) === 0,
			'ブロック OFF で SVG 解除'
		);
		check(
			await reloadedFrame
				.locator( `#block-${ reloadedId }` )
				.evaluate(
					( element ) =>
						window.getComputedStyle( element ).borderTopColor ===
						'rgb(204, 0, 0)'
				),
			'ブロック OFF で標準ボーダー復元'
		);
		await page.evaluate(
			( clientId ) =>
				wp.data
					.dispatch( 'core/block-editor' )
					.updateBlockAttributes( clientId, { odHdbEnabled: true } ),
			reloadedId
		);
		await page.goto( `${ base }/?p=${ postId }&preview=true` );
		await page.locator( '[data-od-hdb].od-hdb-ready > svg' ).waitFor();
		check(
			( await page.locator( '[data-od-hdb] > svg path' ).count() ) === 2,
			'スケッチの二重線'
		);
		await page.screenshot( {
			path: `${ output }/${ name }-frontend.png`,
			fullPage: true,
		} );
		// 同じ公開マークアップで 5 パターン・7 寸法・50 要素を検証する。
		const benchmark = await page.evaluate( async () => {
			const template = document.querySelector( '[data-od-hdb]' );
			const config = JSON.parse( template.dataset.odHdb );
			const gallery = document.createElement( 'main' );
			gallery.id = 'od-hdb-test-gallery';
			gallery.style.cssText =
				'display:grid;grid-template-columns:repeat(5,240px);gap:20px;padding:20px;background:white;color:#222';
			for ( const pattern of [
				'natural',
				'rough',
				'rounded',
				'sketch',
				'wavy',
			] ) {
				for ( const [ width, height ] of [
					[ 320, 320 ],
					[ 600, 200 ],
					[ 200, 600 ],
					[ 1000, 200 ],
					[ 200, 1000 ],
					[ 1200, 120 ],
					[ 120, 800 ],
				] ) {
					const box = template.cloneNode( true );
					box.querySelector( 'svg' )?.remove();
					box.className = 'od-hdb-enabled';
					box.style.cssText = `box-sizing:border-box;width:${ width }px;height:${ height }px;padding:20px;`;
					box.dataset.odHdb = JSON.stringify( {
						...config,
						odHdbPattern: pattern,
					} );
					box.textContent = `${ pattern } ${ width }×${ height }`;
					gallery.appendChild( box );
				}
			}
			while ( gallery.children.length < 50 ) {
				gallery.appendChild(
					gallery.firstElementChild.cloneNode( true )
				);
			}
			window.dispatchEvent( new Event( 'pagehide' ) );
			document.body.replaceChildren( gallery );
			let activeObservers = 0;
			const OriginalObserver = window.ResizeObserver;
			window.ResizeObserver = class extends OriginalObserver {
				constructor( callback ) {
					super( callback );
					activeObservers++;
				}
				disconnect() {
					activeObservers--;
					super.disconnect();
				}
			};
			const boxes = [ ...gallery.children ];
			const configs = boxes.map( ( box ) => box.dataset.odHdb );
			const measurements = [];
			for ( const quantity of [ 1, 10, 30, 50 ] ) {
				window.dispatchEvent( new Event( 'pagehide' ) );
				boxes.forEach( ( box, index ) => {
					if ( index < quantity ) {
						box.dataset.odHdb = configs[ index ];
					} else {
						box.removeAttribute( 'data-od-hdb' );
					}
				} );
				const before = performance.now();
				window.dispatchEvent( new Event( 'pageshow' ) );
				await new Promise( ( resolve ) =>
					window.requestAnimationFrame( () =>
						window.requestAnimationFrame( resolve )
					)
				);
				measurements.push( {
					quantity,
					duration: performance.now() - before,
					svgs: gallery.querySelectorAll( '.od-hdb-ready > svg' )
						.length,
					observers: activeObservers,
				} );
			}
			const duration = measurements[ measurements.length - 1 ].duration;
			const count = gallery.querySelectorAll(
				'.od-hdb-ready > svg'
			).length;
			const first = gallery.firstElementChild;
			const old = first.querySelector( 'path' ).getAttribute( 'd' );
			first.style.width = '400px';
			await new Promise( ( resolve ) => setTimeout( resolve, 100 ) );
			return {
				duration,
				count,
				measurements,
				heapBytes: performance.memory?.usedJSHeapSize ?? null,
				resized:
					old !== first.querySelector( 'path' ).getAttribute( 'd' ),
			};
		} );
		check(
			benchmark.count === 50 &&
				benchmark.resized &&
				benchmark.measurements.every(
					( measurement ) =>
						measurement.svgs === measurement.quantity &&
						measurement.observers === measurement.quantity
				),
			`${ name }: 50 要素・リサイズ`
		);
		if (
			name === 'chromium' &&
			process.env.OD_HDB_WRITE_BASELINES === '1'
		) {
			const directory = `${ __dirname }/baselines`;
			fs.mkdirSync( directory, { recursive: true } );
			await page
				.locator( '#od-hdb-test-gallery > :first-child' )
				.evaluate( ( element ) => {
					element.style.width = '320px';
				} );
			await page.waitForTimeout( 100 );
			const boxes = page.locator( '#od-hdb-test-gallery > *' );
			await page
				.locator( '#od-hdb-test-gallery' )
				.evaluate( ( element ) => {
					element.style.display = 'block';
				} );
			await boxes.evaluateAll( ( elements ) =>
				elements.forEach( ( element ) => {
					element.style.display = 'none';
				} )
			);
			for ( let i = 0; i < 35; i++ ) {
				const box = boxes.nth( i );
				await box.evaluate( ( element ) => {
					element.style.display = 'block';
				} );
				await page.waitForTimeout( 30 );
				const label = ( await box.textContent() ).replace( ' ', '-' );
				await box.screenshot( {
					path: `${ directory }/${ label }.png`,
				} );
			}
		}
		await page.locator( '#od-hdb-test-gallery' ).evaluate( ( element ) => {
			element.style.display = 'grid';
			[ ...element.children ].forEach( ( child ) => {
				child.style.display = 'block';
			} );
		} );
		// 見た目を確認しやすい同一寸法の 5 種類も画像に残す。
		await page.evaluate( () => {
			const gallery = document.querySelector( '#od-hdb-test-gallery' );
			[ ...gallery.children ].forEach( ( box, index ) => {
				if ( index % 7 !== 0 || index >= 35 ) {
					box.remove();
					return;
				}
				box.style.width = '240px';
				box.style.height = '180px';
			} );
		} );
		await page.waitForTimeout( 100 );
		await page
			.locator( '#od-hdb-test-gallery' )
			.screenshot( { path: `${ output }/${ name }-patterns.png` } );
		check( errors.length === 0, `${ name }: ${ errors.join( '; ' ) }` );
		if ( name === 'chromium' ) {
			const noJsContext = await browser.newContext( {
				javaScriptEnabled: false,
				storageState: await page.context().storageState(),
			} );
			const noJs = await noJsContext.newPage();
			await noJs.goto( `${ base }/?p=${ postId }&preview=true` );
			check(
				( await noJs.locator( '[data-od-hdb] > svg' ).count() ) === 0,
				'JavaScript 無効時は SVG なし'
			);
			check(
				await noJs
					.locator( '[data-od-hdb]' )
					.evaluate(
						( element ) =>
							window.getComputedStyle( element )
								.borderTopColor === 'rgb(204, 0, 0)'
					),
				'JavaScript 無効時の標準ボーダー'
			);
			await noJsContext.close();
			await page.goto(
				`${ base }/wp-admin/options-general.php?page=od-chotto-benri`
			);
			const toggle = page.locator(
				'input[name="od_chotto_benri_settings[hand-drawn-border]"]'
			);
			await toggle.uncheck();
			await Promise.all( [
				page.waitForURL( /settings-updated/ ),
				page.locator( '#submit' ).click(),
			] );
			try {
				const response = await page.request.get(
					`${ base }/?p=${ postId }&preview=true`
				);
				const html = await response.text();
				check(
					! html.includes( 'data-od-hdb' ) &&
						! html.includes( 'hand-drawn-border-view.js' ) &&
						! html.includes( 'hand-drawn-border.css' ),
					'オプション OFF で機能・アセット停止'
				);
				await page.goto(
					`${ base }/wp-admin/post.php?post=${ postId }&action=edit`
				);
				await page.waitForFunction(
					() =>
						wp.data?.select( 'core/block-editor' )?.getBlocks()
							.length
				);
				check(
					await page.evaluate(
						() =>
							wp.data
								.select( 'core/block-editor' )
								.getBlocks()[ 0 ].attributes.odHdbSeed ===
							'browser-fixed'
					),
					'機能 OFF 中も属性を復元'
				);
				await page.evaluate( async () => {
					wp.data
						.dispatch( 'core/editor' )
						.editPost( { title: '無効中の設定保持テスト' } );
					await wp.data.dispatch( 'core/editor' ).savePost();
				} );
				await page.reload();
				await page.waitForFunction(
					() =>
						wp.data?.select( 'core/block-editor' )?.getBlocks()
							.length
				);
				check(
					await page.evaluate(
						() =>
							wp.data
								.select( 'core/block-editor' )
								.getBlocks()[ 0 ].attributes.odHdbSeed ===
							'browser-fixed'
					),
					'機能 OFF 中の再保存でも属性保持'
				);
			} finally {
				await page.goto(
					`${ base }/wp-admin/options-general.php?page=od-chotto-benri`
				);
				await toggle.check();
				await Promise.all( [
					page.waitForURL(
						( url ) =>
							url.searchParams.get( 'settings-updated' ) ===
							'true'
					),
					page.locator( '#submit' ).click(),
				] );
			}
		}
		results.push( { browser: name, postId, ...benchmark, errors } );
		await browser.close();
	}
	fs.writeFileSync(
		`${ output }/results.json`,
		JSON.stringify( results, null, 2 )
	);
	process.stdout.write( JSON.stringify( results, null, 2 ) + '\n' );
} )().catch( ( error ) => {
	process.stderr.write( String( error.stack || error ) + '\n' );
	process.exit( 1 );
} );
