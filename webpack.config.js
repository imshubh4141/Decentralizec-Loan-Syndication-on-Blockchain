const path = require('path');

module.exports = {
    mode: 'development',
    entry: './src/js/app.js',
    output: {
        path: path.resolve(__dirname, 'src'),
        filename: 'bundle.js'
    },
    devServer: {
        contentBase: path.join(__dirname, 'src'),
        compress: true,
        port: 8080,
    }
}