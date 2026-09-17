import { __ } from '@wordpress/i18n';

export const LANGUAGE_OPTIONS = [
	{ label: __( 'Not specified', 'od-chotto-benri' ), value: '' },
	{ label: __( 'Japanese — ja', 'od-chotto-benri' ), value: 'ja' },
	{ label: __( 'English — en', 'od-chotto-benri' ), value: 'en' },
	{
		label: __( 'Chinese (Simplified) — zh-Hans', 'od-chotto-benri' ),
		value: 'zh-Hans',
	},
	{
		label: __( 'Chinese (Traditional) — zh-Hant', 'od-chotto-benri' ),
		value: 'zh-Hant',
	},
	{ label: __( 'Korean — ko', 'od-chotto-benri' ), value: 'ko' },
	{ label: __( 'French — fr', 'od-chotto-benri' ), value: 'fr' },
	{ label: __( 'German — de', 'od-chotto-benri' ), value: 'de' },
	{ label: __( 'Spanish — es', 'od-chotto-benri' ), value: 'es' },
	{ label: __( 'Italian — it', 'od-chotto-benri' ), value: 'it' },
	{ label: __( 'Portuguese — pt', 'od-chotto-benri' ), value: 'pt' },
];
