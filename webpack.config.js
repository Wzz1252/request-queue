const path = require('path');
module.exports = {
    mode: 'development',
    entry: './src/Index.ts',
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist')
    },
    module: {
        rules: [{
            test: /\.ts$/,
            use: "ts-loader"
        }]
    },
    resolve: {
        extensions: ['.ts', '.js'],
        fallback: { "https": false, "http": false }
    }
};