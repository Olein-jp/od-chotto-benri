import { InspectorControls, useSettings } from '@wordpress/block-editor';
import {
	Button,
	ColorPalette,
	PanelBody,
	RangeControl,
	SelectControl,
	ToggleControl,
} from '@wordpress/components';
import { useEffect, useRef, useState } from '@wordpress/element';
import { addFilter } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';
import { generateBorder, patterns } from './engine';
import { mountBorder, resolveTarget } from './renderer';
import { createColorPalettes, findPalettePreset } from './palette';

const config = window.odHdb || { blocks: [], attributes: {} };

const names = {
	natural: __( 'Natural', 'od-chotto-benri' ),
	rough: __( 'Rough', 'od-chotto-benri' ),
	rounded: __( 'Rounded', 'od-chotto-benri' ),
	sketch: __( 'Sketch', 'od-chotto-benri' ),
	wavy: __( 'Wavy', 'od-chotto-benri' ),
};
function newSeed() {
	const values = new Uint32Array( 2 );
	window.crypto.getRandomValues( values );
	return Array.from( values, ( value ) => value.toString( 36 ) ).join( '-' );
}
function Controls( { attributes, setAttributes } ) {
	const [ theme, custom, defaults, showDefault, customColor = true, legacy ] =
		useSettings(
			'color.palette.theme',
			'color.palette.custom',
			'color.palette.default',
			'color.defaultPalette',
			'color.custom',
			'color.palette'
		);
	const paletteNames = {
		theme: __( 'Theme colors', 'od-chotto-benri' ),
		custom: __( 'Custom colors', 'od-chotto-benri' ),
		default: __( 'Default colors', 'od-chotto-benri' ),
		legacy: __( 'Colors', 'od-chotto-benri' ),
	};
	const palettes = createColorPalettes( {
		theme,
		custom,
		defaults,
		showDefault,
		legacy,
	} ).map( ( group ) => ( { ...group, name: paletteNames[ group.slug ] } ) );
	const palette = palettes.flatMap( ( group ) => group.colors );
	const current = attributes.odHdbColor;
	const selected = current?.startsWith( 'var:preset|color|' )
		? palette.find( ( entry ) => entry.slug === current.split( '|' )[ 2 ] )
				?.color
		: current;
	return (
		<InspectorControls>
			<PanelBody
				title={ __( 'Hand-drawn border', 'od-chotto-benri' ) }
				initialOpen={ false }
			>
				<ToggleControl
					label={ __(
						'Enable hand-drawn border',
						'od-chotto-benri'
					) }
					checked={ !! attributes.odHdbEnabled }
					onChange={ ( enabled ) =>
						setAttributes( {
							odHdbEnabled: enabled,
							...( enabled && ! attributes.odHdbSeed
								? { odHdbSeed: newSeed() }
								: {} ),
						} )
					}
				/>
				{ attributes.odHdbEnabled && (
					<>
						<div
							className="od-hdb-patterns"
							role="group"
							aria-label={ __( 'Pattern', 'od-chotto-benri' ) }
						>
							{ Object.keys( patterns ).map( ( pattern ) => (
								<Button
									key={ pattern }
									variant={
										attributes.odHdbPattern === pattern
											? 'primary'
											: 'secondary'
									}
									aria-pressed={
										attributes.odHdbPattern === pattern
									}
									onClick={ () =>
										setAttributes( {
											odHdbPattern: pattern,
										} )
									}
								>
									<svg
										viewBox="0 0 110 48"
										aria-hidden="true"
										focusable="false"
									>
										{ generateBorder( {
											width: 110,
											height: 48,
											pattern,
											seed: 'preview',
										} ).paths.map( ( path, index ) => (
											<path
												key={ index }
												d={ path.d }
												opacity={ path.opacity }
												fill="none"
												stroke="currentColor"
												strokeWidth="2"
											/>
										) ) }
									</svg>
									{ names[ pattern ] }
								</Button>
							) ) }
						</div>
						<p>
							{ __(
								'Line color (clear to inherit)',
								'od-chotto-benri'
							) }
						</p>
						<ColorPalette
							colors={ palettes }
							disableCustomColors={ ! customColor }
							value={ selected }
							onChange={ ( color, index, slug ) => {
								const preset = findPalettePreset(
									palettes,
									color,
									index,
									slug
								);
								setAttributes( {
									odHdbColor: preset?.slug
										? `var:preset|color|${ preset.slug }`
										: color || null,
								} );
							} }
						/>
						<ToggleControl
							label={ __(
								'Inherit line width',
								'od-chotto-benri'
							) }
							checked={
								attributes.odHdbWidth === null ||
								attributes.odHdbWidth === undefined
							}
							onChange={ ( inherit ) =>
								setAttributes( {
									odHdbWidth: inherit ? null : 2,
								} )
							}
						/>
						{ attributes.odHdbWidth !== null &&
							attributes.odHdbWidth !== undefined && (
								<RangeControl
									label={ __(
										'Line width (px)',
										'od-chotto-benri'
									) }
									min={ 1 }
									max={ 8 }
									step={ 0.5 }
									value={ attributes.odHdbWidth }
									onChange={ ( width ) =>
										setAttributes( { odHdbWidth: width } )
									}
								/>
							) }
						<SelectControl
							label={ __( 'Roughness', 'od-chotto-benri' ) }
							value={ String( attributes.odHdbRoughness ) }
							options={ [
								{
									label: __( 'Weak', 'od-chotto-benri' ),
									value: '0.5',
								},
								{
									label: __( 'Normal', 'od-chotto-benri' ),
									value: '1',
								},
								{
									label: __( 'Strong', 'od-chotto-benri' ),
									value: '1.5',
								},
							] }
							onChange={ ( value ) =>
								setAttributes( {
									odHdbRoughness: Number( value ),
								} )
							}
						/>
						<Button
							variant="secondary"
							onClick={ () =>
								setAttributes( { odHdbSeed: newSeed() } )
							}
						>
							{ __( 'Regenerate pattern', 'od-chotto-benri' ) }
						</Button>
						<p>
							{ __(
								'Dedicated settings override standard borders, then theme styles, then 2px/currentColor. Different edges use the top edge as a representative value.',
								'od-chotto-benri'
							) }
						</p>
					</>
				) }
			</PanelBody>
		</InspectorControls>
	);
}
addFilter(
	'editor.BlockEdit',
	'od-hdb/controls',
	( BlockEdit ) => ( props ) => (
		<>
			<BlockEdit { ...props } />
			{ config.blocks.includes( props.name ) && (
				<Controls { ...props } />
			) }
		</>
	)
);

function Preview( { props, BlockListBlock } ) {
	const [ ready, setReady ] = useState( false );
	const [ positioned, setPositioned ] = useState( false );
	const anchor = useRef();
	const renderer = useRef();
	const latest = useRef( props.attributes );
	latest.current = props.attributes;
	const enabled =
		config.blocks.includes( props.name ) && props.attributes.odHdbEnabled;
	useEffect( () => {
		if ( ! enabled ) {
			return;
		}
		const document = anchor.current?.ownerDocument;
		const target = document && resolveTarget( document, props.clientId );
		if ( ! target ) {
			return;
		}
		setPositioned(
			document.defaultView.getComputedStyle( target ).position ===
				'static'
		);
		renderer.current = mountBorder( target, latest.current, setReady );
		return () => {
			renderer.current?.destroy();
			renderer.current = null;
			setReady( false );
		};
	}, [ enabled, props.clientId ] );
	useEffect( () => {
		renderer.current?.update( props.attributes );
	}, [ props.attributes ] );
	return (
		<>
			<BlockListBlock
				{ ...props }
				className={ [
					props.className,
					enabled && 'od-hdb-enabled',
					enabled && ready && 'od-hdb-ready',
					enabled && positioned && 'od-hdb-positioned',
				]
					.filter( Boolean )
					.join( ' ' ) }
			/>
			<span
				ref={ anchor }
				style={ { display: 'none' } }
				aria-hidden="true"
			/>
		</>
	);
}
addFilter(
	'editor.BlockListBlock',
	'od-hdb/preview',
	( BlockListBlock ) => ( props ) =>
		config.blocks.includes( props.name ) ? (
			<Preview props={ props } BlockListBlock={ BlockListBlock } />
		) : (
			<BlockListBlock { ...props } />
		)
);
