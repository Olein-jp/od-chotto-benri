import { RichTextToolbarButton } from '@wordpress/block-editor';
import {
	Button,
	Flex,
	FlexItem,
	Popover,
	SelectControl,
	TextControl,
	ToggleControl,
} from '@wordpress/components';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { code } from '@wordpress/icons';
import {
	applyFormat,
	getActiveFormat,
	isCollapsed,
	removeFormat,
	useAnchor,
} from '@wordpress/rich-text';

import {
	createFormatAttributes,
	EMPTY_ATTRIBUTES,
	isValidClassNames,
	normaliseClassNames,
} from './attributes';
import { FORMAT_NAME, FORMAT_SETTINGS } from './constants';
import { LANGUAGE_OPTIONS } from './languages';

function getFormAttributes( value ) {
	const activeFormat = getActiveFormat( value, FORMAT_NAME );
	const attributes = activeFormat?.attributes || {};

	return {
		class: attributes.class || '',
		ariaHidden: attributes.ariaHidden === 'true',
		ariaLabel: attributes.ariaLabel || '',
		lang: attributes.lang || '',
	};
}

function AttributePopover( {
	attributes,
	contentRef,
	onApply,
	onCancel,
	onRemove,
	setAttributes,
} ) {
	const anchor = useAnchor( {
		editableContentElement: contentRef.current,
		settings: FORMAT_SETTINGS,
	} );
	const normalisedClasses = normaliseClassNames( attributes.class );
	const classNamesAreValid = isValidClassNames( normalisedClasses );

	return (
		<Popover
			anchor={ anchor }
			focusOnMount="firstElement"
			onClose={ onCancel }
			placement="bottom-start"
		>
			<form
				onSubmit={ ( event ) => {
					event.preventDefault();

					if ( classNamesAreValid ) {
						onApply( {
							...attributes,
							class: normalisedClasses,
						} );
					}
				} }
				style={ { minWidth: '320px', padding: '16px' } }
			>
				<h2 style={ { marginTop: 0 } }>
					{ __( 'Inline attributes', 'od-chotto-benri' ) }
				</h2>
				<TextControl
					label={ __( 'CSS classes', 'od-chotto-benri' ) }
					value={ attributes.class }
					onChange={ ( nextClass ) =>
						setAttributes( { ...attributes, class: nextClass } )
					}
					__next40pxDefaultSize
					__nextHasNoMarginBottom
					help={
						classNamesAreValid
							? __(
									'Separate multiple classes with spaces.',
									'od-chotto-benri'
							  )
							: __(
									'Enter valid CSS class names separated by spaces.',
									'od-chotto-benri'
							  )
					}
				/>
				<h3>{ __( 'Accessibility', 'od-chotto-benri' ) }</h3>
				<ToggleControl
					label={ __(
						'Hide from assistive technologies',
						'od-chotto-benri'
					) }
					checked={ attributes.ariaHidden }
					onChange={ ( ariaHidden ) =>
						setAttributes( { ...attributes, ariaHidden } )
					}
					help={ __(
						'Use this for decorative text that does not need to be announced.',
						'od-chotto-benri'
					) }
					__nextHasNoMarginBottom
				/>
				<TextControl
					label={ __( 'Accessible label', 'od-chotto-benri' ) }
					value={ attributes.ariaLabel }
					onChange={ ( ariaLabel ) =>
						setAttributes( { ...attributes, ariaLabel } )
					}
					disabled={ attributes.ariaHidden }
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
				<SelectControl
					label={ __( 'Language', 'od-chotto-benri' ) }
					value={ attributes.lang }
					options={ LANGUAGE_OPTIONS }
					onChange={ ( lang ) =>
						setAttributes( { ...attributes, lang } )
					}
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
				<Flex style={ { marginTop: '24px' } }>
					<FlexItem>
						<Button variant="tertiary" onClick={ onRemove }>
							{ __( 'Remove', 'od-chotto-benri' ) }
						</Button>
					</FlexItem>
					<FlexItem>
						<Flex>
							<FlexItem>
								<Button
									variant="secondary"
									onClick={ onCancel }
								>
									{ __( 'Cancel', 'od-chotto-benri' ) }
								</Button>
							</FlexItem>
							<FlexItem>
								<Button
									variant="primary"
									type="submit"
									disabled={ ! classNamesAreValid }
								>
									{ __( 'Apply', 'od-chotto-benri' ) }
								</Button>
							</FlexItem>
						</Flex>
					</FlexItem>
				</Flex>
			</form>
		</Popover>
	);
}

export default function Edit( {
	contentRef,
	isActive,
	onChange,
	onFocus,
	value,
} ) {
	const [ isPopoverVisible, setIsPopoverVisible ] = useState( false );
	const [ attributes, setAttributes ] = useState( EMPTY_ATTRIBUTES );

	function closePopover() {
		setIsPopoverVisible( false );
		onFocus();
	}

	function removeInlineAttributes() {
		onChange( removeFormat( value, FORMAT_NAME ) );
		closePopover();
	}

	function applyInlineAttributes( nextAttributes ) {
		const formatAttributes = createFormatAttributes( nextAttributes );

		if ( Object.keys( formatAttributes ).length === 0 ) {
			onChange( removeFormat( value, FORMAT_NAME ) );
		} else {
			onChange(
				applyFormat( value, {
					type: FORMAT_NAME,
					attributes: formatAttributes,
				} )
			);
		}

		closePopover();
	}

	return (
		<>
			<RichTextToolbarButton
				icon={ code }
				label={ __( 'Inline attributes', 'od-chotto-benri' ) }
				title={ __(
					'Set inline attributes on the selected text',
					'od-chotto-benri'
				) }
				onClick={ () => {
					setAttributes( getFormAttributes( value ) );
					setIsPopoverVisible( true );
				} }
				isActive={ isActive }
				disabled={ isCollapsed( value ) && ! isActive }
				role="menuitemcheckbox"
			/>
			{ isPopoverVisible && (
				<AttributePopover
					attributes={ attributes }
					contentRef={ contentRef }
					onApply={ applyInlineAttributes }
					onCancel={ closePopover }
					onRemove={ removeInlineAttributes }
					setAttributes={ setAttributes }
				/>
			) }
		</>
	);
}
