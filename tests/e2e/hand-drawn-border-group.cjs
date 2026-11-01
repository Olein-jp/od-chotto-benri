/* 見出し・段落を含む実際のグループで、UI 操作と装飾位置を検証する。 */
const { chromium, firefox, webkit } = require( '@playwright/test' );
const fs = require( 'node:fs' );
const blockName = process.argv[ 2 ] || 'core/group';
const base = process.env.OD_HDB_URL || 'http://localhost:18945';
const output =
	process.env.OD_HDB_OUTPUT ||
	( blockName === 'unitone/decorator'
		? '/tmp/od-hdb-unitone-results'
		: '/tmp/od-hdb-group-results' );
fs.mkdirSync( output, { recursive: true } );
const check = ( value, message ) => {
	if ( ! value ) {
		throw new Error( message );
	}
};
async function measure( frame, selector ) {
	return frame.locator( selector ).evaluateAll( ( elements ) =>
		elements.map( ( element ) => {
			const rect = element.getBoundingClientRect();
			const svg = element.querySelector( ':scope > svg.od-hdb-border' );
			const layer = svg?.getBoundingClientRect();
			const css = svg && window.getComputedStyle( svg );
			const path = svg?.querySelector( 'path' );
			const pathBounds = path?.getBBox();
			const thickness = path
				? parseFloat( window.getComputedStyle( path ).strokeWidth )
				: 0;
			return {
				width: rect.width,
				height: rect.height,
				offsetX: layer ? layer.x - rect.x : null,
				offsetY: layer ? layer.y - rect.y : null,
				widthError: layer ? layer.width - rect.width : null,
				heightError: layer ? layer.height - rect.height : null,
				edgeGaps:
					pathBounds && layer
						? [
								layer.x - rect.x + pathBounds.x - thickness / 2,
								layer.y - rect.y + pathBounds.y - thickness / 2,
								rect.right -
									( layer.x +
										pathBounds.x +
										pathBounds.width +
										thickness / 2 ),
								rect.bottom -
									( layer.y +
										pathBounds.y +
										pathBounds.height +
										thickness / 2 ),
						  ]
						: [],
				stroke: svg?.firstElementChild
					? window.getComputedStyle( svg.firstElementChild ).stroke
					: null,
				position: css?.position,
				margin: css?.margin,
				children: [ ...element.querySelectorAll( 'h2, p' ) ]
					.filter( ( child ) =>
						[ 'H2', 'P' ].includes( child.tagName )
					)
					.map( ( child ) => {
						const childRect = child.getBoundingClientRect();
						return {
							x: childRect.x - rect.x,
							y: childRect.y - rect.y,
							width: childRect.width,
							height: childRect.height,
						};
					} ),
			};
		} )
	);
}
function assertLayers( measurements, label ) {
	for ( const item of measurements ) {
		check(
			item.edgeGaps.length === 4 &&
				item.edgeGaps.every( ( gap ) => Math.abs( gap ) < 1.1 ),
			`${ label }: 線の外縁がブロックの境界から離れている ${ JSON.stringify(
				item.edgeGaps
			) }`
		);
		check(
			item.stroke &&
				! [ 'none', 'transparent', 'rgba(0, 0, 0, 0)' ].includes(
					item.stroke
				),
			`${ label }: 枠線が透明になっている`
		);
		check(
			item.position === 'absolute' && item.margin === '0px',
			`${ label }: SVG の配置・余白`
		);
		check(
			[
				item.offsetX,
				item.offsetY,
				item.widthError,
				item.heightError,
			].every( ( value ) => value !== null && Math.abs( value ) < 1.1 ),
			`${ label }: 枠がグループの寸法・位置と一致しない ${ JSON.stringify(
				item
			) }`
		);
	}
}
( async () => {
	const results = [];
	for ( const [ name, type ] of Object.entries( {
		chromium,
		firefox,
		webkit,
	} ) ) {
		const executablePath = process.env[ `OD_HDB_${ name.toUpperCase() }` ];
		const browser = await type.launch( {
			headless: true,
			...( executablePath ? { executablePath } : {} ),
		} );
		let page;
		try {
			page = await browser.newPage( {
				viewport: { width: 1400, height: 1100 },
			} );
			// このテストで使わないパターン一覧を固定し、外部通信の中断を避ける。
			await page.route( '**/*wp_pattern_category*', ( route ) =>
				route.fulfill( {
					status: 200,
					contentType: 'application/json',
					body: '[]',
				} )
			);
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
				( targetName ) =>
					wp.blocks.getBlockType( targetName )?.attributes
						.odHdbEnabled,
				blockName
			);
			await page.waitForFunction(
				() => wp.data.select( 'core/editor' ).getCurrentPostId() > 0
			);
			await page
				.frameLocator( 'iframe[name="editor-canvas"]' )
				.locator( '[contenteditable="true"]' )
				.first()
				.waitFor();
			const ids = await page.evaluate( ( targetBlockName ) => {
				if (
					wp.data
						.select( 'core/edit-post' )
						?.isFeatureActive( 'welcomeGuide' )
				) {
					wp.data
						.dispatch( 'core/edit-post' )
						.toggleFeature( 'welcomeGuide' );
				}
				let blocks;
				if ( targetBlockName === 'unitone/decorator' ) {
					blocks = [
						{},
						{
							href: 'https://example.com/decorator',
							linkText: '詳しく読む',
							rel: 'nofollow',
						},
						{
							tagName: 'section',
							style: {
								border: {
									width: '4px',
									style: 'solid',
									color: '#315f57',
								},
							},
						},
					].map( ( extra ) =>
						wp.blocks.createBlock(
							targetBlockName,
							{ unitone: { padding: '1', gap: '1' }, ...extra },
							[
								wp.blocks.createBlock( 'core/heading', {
									content: 'デコレーター内の見出し',
								} ),
								wp.blocks.createBlock( 'core/paragraph', {
									content:
										'unitone のデコレーター内の段落です。枠の表示を確認します。',
								} ),
							]
						)
					);
				} else {
					blocks = [ 'constrained', 'default', 'flex' ].map(
						( layoutType ) =>
							wp.blocks.createBlock(
								'core/group',
								{
									layout: { type: layoutType },
									style: {
										spacing: {
											padding: {
												top: '24px',
												right: '24px',
												bottom: '24px',
												left: '24px',
											},
											blockGap: '48px',
										},
									},
								},
								[
									wp.blocks.createBlock( 'core/heading', {
										content: 'グループ内の見出し',
									} ),
									wp.blocks.createBlock( 'core/paragraph', {
										content:
											'グループ内の段落です。見出しと文章を囲む枠を確認します。',
									} ),
									wp.blocks.createBlock( 'core/paragraph', {
										content: '2つ目の段落です。',
									} ),
								]
							)
					);
					blocks.push(
						wp.blocks.createBlock(
							'core/group',
							{
								layout: { type: 'constrained' },
								style: {
									spacing: {
										padding: {
											top: '24px',
											right: '24px',
											bottom: '24px',
											left: '24px',
										},
									},
								},
							},
							[
								wp.blocks.createBlock( 'core/paragraph', {
									content: '段落だけを入れたグループです。',
								} ),
							]
						)
					);
				}
				wp.data.dispatch( 'core/block-editor' ).resetBlocks( blocks );
				wp.data.dispatch( 'core/editor' ).editPost( {
					title: '見出し・段落グループの回帰検証',
					status: 'draft',
				} );
				wp.data
					.dispatch( 'core/block-editor' )
					.selectBlock( blocks[ 0 ].clientId );
				return blocks.map( ( block ) => block.clientId );
			}, blockName );
			let editor;
			for ( let i = 0; i < 60; i++ ) {
				editor = page
					.frames()
					.find( ( frame ) => frame.name() === 'editor-canvas' );
				if (
					editor &&
					( await editor.locator( `#block-${ ids[ 0 ] }` ).count() )
				) {
					break;
				}
				await page.waitForTimeout( 100 );
			}
			check( editor, '編集 iframe が見つからない' );
			const selector = ids.map( ( id ) => `#block-${ id }` ).join( ',' );
			const before = await measure( editor, selector );
			check( before.length === ids.length, '検証対象ブロックの初期配置' );
			await page.evaluate( () =>
				wp.data
					.dispatch( 'core/edit-post' )
					.openGeneralSidebar( 'edit-post/block' )
			);
			const settingsTab = page.getByRole( 'tab', {
				name: 'Settings',
				exact: true,
			} );
			if ( await settingsTab.count() ) {
				await settingsTab.click();
			}
			await page
				.getByRole( 'button', {
					name: 'Hand-drawn border',
					exact: true,
				} )
				.click();
			await page
				.getByRole( 'checkbox', {
					name: 'Enable hand-drawn border',
					exact: true,
				} )
				.check();
			await page.evaluate(
				( remaining ) =>
					remaining.forEach( ( id ) =>
						wp.data
							.dispatch( 'core/block-editor' )
							.updateBlockAttributes( id, {
								odHdbEnabled: true,
								odHdbSeed: 'fixed',
							} )
					),
				ids.slice( 1 )
			);
			await editor
				.locator( `#block-${ ids[ 0 ] }.od-hdb-ready > svg` )
				.waitFor();
			await page.waitForTimeout( 250 );
			const after = await measure( editor, selector );
			assertLayers( after, `${ name } 編集画面` );
			after.forEach( ( item, index ) => {
				check(
					Math.abs( item.height - before[ index ].height ) < 1,
					'有効化でグループの高さが変化'
				);
				check(
					JSON.stringify( item.children ) ===
						JSON.stringify( before[ index ].children ),
					'有効化で見出し・段落の配置が変化'
				);
			} );
			await editor
				.locator( `#block-${ ids[ 0 ] }` )
				.screenshot( { path: `${ output }/${ name }-editor.png` } );
			const variants = [];
			for ( const pattern of [
				'natural',
				'rough',
				'rounded',
				'sketch',
				'wavy',
			] ) {
				for ( const lineWidth of [ 1, 2, 8 ] ) {
					await page.evaluate(
						( settings ) =>
							wp.data
								.dispatch( 'core/block-editor' )
								.updateBlockAttributes( settings.id, {
									odHdbPattern: settings.pattern,
									odHdbWidth: settings.lineWidth,
								} ),
						{ id: ids[ 0 ], pattern, lineWidth }
					);
					await editor.waitForFunction(
						( settings ) => {
							const path = document
								.getElementById( `block-${ settings.id }` )
								?.querySelector( ':scope > svg > path' );
							return (
								path &&
								parseFloat(
									window.getComputedStyle( path ).strokeWidth
								) === settings.lineWidth &&
								Math.abs(
									path.getBBox().x - settings.lineWidth / 2
								) < 0.01
							);
						},
						{ id: ids[ 0 ], lineWidth }
					);
					const measurements = await measure( editor, selector );
					assertLayers(
						measurements,
						`${ name } ${ pattern } ${ lineWidth }px`
					);
					variants.push( { pattern, lineWidth, measurements } );
				}
			}
			await page.evaluate(
				( id ) =>
					wp.data
						.dispatch( 'core/block-editor' )
						.updateBlockAttributes( id, {
							odHdbPattern: 'natural',
							odHdbWidth: null,
						} ),
				ids[ 0 ]
			);
			await editor.waitForFunction( ( id ) => {
				const path = document
					.getElementById( `block-${ id }` )
					?.querySelector( ':scope > svg > path' );
				return (
					path &&
					parseFloat(
						window.getComputedStyle( path ).strokeWidth
					) === 2
				);
			}, ids[ 0 ] );
			const selected = editor.locator( `#block-${ ids[ 0 ] }` );
			await selected.scrollIntoViewIfNeeded();
			const selectedBox = await selected.boundingBox();
			await page.screenshot( {
				path: `${ output }/${ name }-boundary-editor.png`,
				clip: {
					x: selectedBox.x - 4,
					y: selectedBox.y - 4,
					width: selectedBox.width + 8,
					height: selectedBox.height + 8,
				},
			} );
			const postId = await page.evaluate( async () => {
				await wp.data.dispatch( 'core/editor' ).savePost();
				return wp.data.select( 'core/editor' ).getCurrentPostId();
			} );
			await page.reload();
			await page.waitForFunction(
				() => wp.data?.select( 'core/block-editor' )?.getBlocks().length
			);
			check(
				await page.evaluate(
					( expectedName ) =>
						wp.data
							.select( 'core/block-editor' )
							.getBlocks()
							.every(
								( block ) =>
									block.name === expectedName &&
									block.isValid &&
									block.attributes.odHdbEnabled
							),
					blockName
				),
				'保存・再編集時の設定とブロック検証'
			);
			await page.goto( `${ base }/?p=${ postId }&preview=true` );
			await page
				.locator( '[data-od-hdb].od-hdb-ready > svg' )
				.first()
				.waitFor();
			if ( blockName === 'unitone/decorator' ) {
				check(
					( await page
						.locator(
							'[data-od-hdb][data-unitone-layout~="decorator"]'
						)
						.count() ) === 3,
					'デコレーター本体に装飾が付く'
				);
				check(
					( await page
						.locator(
							'[data-od-hdb] a[href="https://example.com/decorator"]'
						)
						.count() ) === 1,
					'ブロックリンクの保持'
				);
				check(
					( await page.locator( 'section[data-od-hdb]' ).count() ) ===
						1,
					'HTML 要素の変更を保持'
				);
			}
			const frontend = await measure( page, '[data-od-hdb]' );
			assertLayers( frontend, `${ name } 公開画面` );
			await page
				.locator( '[data-od-hdb]' )
				.first()
				.screenshot( { path: `${ output }/${ name }-frontend.png` } );
			// テーマの幅制限より広いグループでも SVG をグループ全体に合わせる。
			await page
				.locator( '[data-od-hdb]' )
				.first()
				.evaluate( ( element ) => {
					element.style.width = '1100px';
					element.style.maxWidth = 'none';
				} );
			await page.waitForTimeout( 100 );
			assertLayers(
				await measure( page, '[data-od-hdb]' ),
				`${ name } 幅変更`
			);
			// 配置用 CSS が欠落しても段落下の通常フローへ SVG が落ちないこと。
			await page
				.locator( 'link[href*="hand-drawn-border.css"]' )
				.evaluateAll( ( links ) =>
					links.forEach( ( link ) => link.remove() )
				);
			assertLayers(
				await measure( page, '[data-od-hdb]' ),
				`${ name } CSS 欠落`
			);
			check( errors.length === 0, errors.join( '; ' ) );
			results.push( {
				browser: name,
				before,
				after,
				frontend,
				variants,
				errors,
			} );
		} catch ( error ) {
			await page?.screenshot( {
				path: `${ output }/${ name }-failure.png`,
				fullPage: true,
			} );
			if ( page ) {
				fs.writeFileSync(
					`${ output }/${ name }-failure.html`,
					await page.content()
				);
			}
			throw new Error( `${ name }: ${ error.stack || error }` );
		} finally {
			await browser.close();
		}
	}
	fs.writeFileSync(
		`${ output }/results.json`,
		JSON.stringify( results, null, 2 )
	);
	process.stdout.write(
		`3 ブラウザーで ${ blockName } の UI 有効化・保存・配置・公開表示・幅変更・CSS 欠落を検証しました。\n`
	);
} )().catch( ( error ) => {
	process.stderr.write( String( error.stack || error ) + '\n' );
	process.exit( 1 );
} );
