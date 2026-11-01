const config = require( '@wordpress/scripts/config/webpack.config' );
module.exports = {
	...config,
	entry: {
		index: './src/index.js',
		'hand-drawn-border-editor': './src/hand-drawn-border/editor.js',
		'hand-drawn-border-view': './src/hand-drawn-border/view.js',
	},
};
