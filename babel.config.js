require('regenerator-runtime/runtime');

module.exports = (api) => {
    api.cache(true);

    const presets = ['@babel/preset-env'];
    const plugins = ['@babel/plugin-proposal-throw-expressions'];

    return {
        presets,
        plugins,
    };
};
