/* 検証専用サイトでグローバルスタイルを一時変更し、finally で復元する。 */
const { chromium, firefox, webkit } = require( '@playwright/test' );
const fs = require( 'node:fs' );
const base = process.env.OD_HDB_URL || 'http://localhost:18946';
const output = process.env.OD_HDB_OUTPUT || '/tmp/od-hdb-palette-results';
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
		const executablePath = process.env[ `OD_HDB_${ name.toUpperCase() }` ];
		const browser = await type.launch( {
			headless: true,
			...( executablePath ? { executablePath } : {} ),
		} );
		let page, original;
		try {
			const context = await browser.newContext( {
				viewport: { width: 1400, height: 1100 },
			} );
			page = await context.newPage();
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
				() =>
					wp.apiFetch &&
					wp.data?.select( 'core/editor' )?.getCurrentPostId() > 0
			);
			original = await page.evaluate( async () => {
				const theme = await wp.data
					.resolveSelect( 'core' )
					.getCurrentTheme();
				const href = theme._links[ 'wp:user-global-styles' ][ 0 ].href;
				const id = Number( href.match( /global-styles\/(\d+)/ )[ 1 ] );
				const path = `/wp/v2/global-styles/${ id }`;
				const current = await wp.apiFetch( { path } );
				return { path, settings: current.settings };
			} );
			await page.evaluate(
				async ( backup ) =>
					wp.apiFetch( {
						path: backup.path,
						method: 'POST',
						data: {
							settings: {
								...backup.settings,
								color: {
									...backup.settings.color,
									custom: false,
									defaultPalette: false,
									palette: [
										{
											name: 'OD HDB user color',
											slug: 'od-hdb-user',
											color: '#1a7f60',
										},
									],
								},
							},
						},
					} ),
				original
			);
			await page.reload();
			await page.waitForFunction(
				() =>
					wp.blocks.getBlockType( 'unitone/decorator' )?.attributes
						.odHdbEnabled &&
					wp.data.select( 'core/editor' ).getCurrentPostId() > 0
			);
			await page
				.frameLocator( 'iframe[name="editor-canvas"]' )
				.locator( '[contenteditable="true"]' )
				.first()
				.waitFor();
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
				const block = wp.blocks.createBlock(
					'unitone/decorator',
					{
						odHdbEnabled: true,
						odHdbSeed: 'palette-fixed',
						unitone: { padding: '1' },
					},
					[
						wp.blocks.createBlock( 'core/paragraph', {
							content: 'テーマの色とユーザーの色の確認',
						} ),
					]
				);
				wp.data
					.dispatch( 'core/block-editor' )
					.resetBlocks( [ block ] );
				wp.data
					.dispatch( 'core/block-editor' )
					.selectBlock( block.clientId );
				wp.data.dispatch( 'core/editor' ).editPost( {
					title: 'カラーパレットの検証',
					status: 'draft',
				} );
			} );
			const openPanel = async () => {
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
				const button = page.getByRole( 'button', {
					name: 'Hand-drawn border',
					exact: true,
				} );
				if (
					( await button.getAttribute( 'aria-expanded' ) ) !== 'true'
				) {
					await button.click();
				}
				return page
					.locator( '.components-panel__body' )
					.filter( { has: button } );
			};
			let panel = await openPanel();
			await panel
				.getByRole( 'heading', { name: 'Theme colors', exact: true } )
				.waitFor();
			await panel
				.getByRole( 'heading', { name: 'Custom colors', exact: true } )
				.waitFor();
			check(
				( await panel
					.getByRole( 'heading', {
						name: 'Default colors',
						exact: true,
					} )
					.count() ) === 0,
				'禁止された標準色を表示しない'
			);
			check(
				( await panel
					.locator(
						'.components-color-palette__custom-color-wrapper'
					)
					.count() ) === 0,
				'任意色の禁止を尊重する'
			);
			await panel
				.locator( 'button[aria-label="OD HDB user color"]' )
				.click();
			await page.waitForFunction(
				() =>
					wp.data.select( 'core/block-editor' ).getBlocks()[ 0 ]
						.attributes.odHdbColor ===
					'var:preset|color|od-hdb-user'
			);
			await panel.locator( 'button[aria-label="Accent"]' ).click();
			await page.waitForFunction(
				() =>
					wp.data.select( 'core/block-editor' ).getBlocks()[ 0 ]
						.attributes.odHdbColor ===
					'var:preset|color|unitone-accent'
			);
			await page.evaluate( () =>
				wp.data.dispatch( 'core/editor' ).savePost()
			);
			await page.reload();
			await page.waitForFunction(
				() =>
					wp.data?.select( 'core/block-editor' )?.getBlocks()[ 0 ]
						?.attributes.odHdbColor ===
					'var:preset|color|unitone-accent'
			);
			await page.evaluate( () =>
				wp.data
					.dispatch( 'core/block-editor' )
					.selectBlock(
						wp.data.select( 'core/block-editor' ).getBlocks()[ 0 ]
							.clientId
					)
			);
			panel = await openPanel();
			await panel
				.locator( 'button[aria-label="OD HDB user color"]' )
				.click();
			await page.waitForFunction(
				() =>
					wp.data.select( 'core/block-editor' ).getBlocks()[ 0 ]
						.attributes.odHdbColor ===
					'var:preset|color|od-hdb-user'
			);
			await panel.screenshot( {
				path: `${ output }/${ name }-palette.png`,
			} );
			const postId = await page.evaluate( async () => {
				await wp.data.dispatch( 'core/editor' ).savePost();
				return wp.data.select( 'core/editor' ).getCurrentPostId();
			} );
			await page.reload();
			await page.waitForFunction(
				() =>
					wp.data?.select( 'core/block-editor' )?.getBlocks()[ 0 ]
						?.attributes.odHdbColor ===
					'var:preset|color|od-hdb-user'
			);
			const preview = await page.context().newPage();
			await preview.goto( `${ base }/?p=${ postId }&preview=true` );
			await preview
				.locator( '[data-od-hdb].od-hdb-ready > svg' )
				.waitFor();
			const stroke = await preview
				.locator( '[data-od-hdb] > svg > path' )
				.first()
				.evaluate( ( path ) => window.getComputedStyle( path ).stroke );
			check(
				stroke === 'rgb(26, 127, 96)',
				`ユーザー色の公開表示: ${ stroke }`
			);
			check( errors.length === 0, errors.join( '; ' ) );
			results.push( {
				browser: name,
				themePreset: 'unitone-accent',
				customPreset: 'od-hdb-user',
				stroke,
				errors,
			} );
		} catch ( error ) {
			await page?.screenshot( {
				path: `${ output }/${ name }-failure.png`,
				fullPage: true,
			} );
			throw new Error( `${ name }: ${ error.stack || error }` );
		} finally {
			try {
				if ( original && page ) {
					await page.evaluate(
						( backup ) =>
							wp.apiFetch( {
								path: backup.path,
								method: 'POST',
								data: { settings: backup.settings },
							} ),
						original
					);
				}
			} finally {
				await browser.close();
			}
		}
	}
	fs.writeFileSync(
		`${ output }/results.json`,
		JSON.stringify( results, null, 2 )
	);
	process.stdout.write(
		'3 ブラウザーでテーマ色・ユーザー色の併記、選択、保存、公開表示を確認しました。\n'
	);
} )().catch( ( error ) => {
	process.stderr.write( String( error.stack || error ) + '\n' );
	process.exit( 1 );
} );
