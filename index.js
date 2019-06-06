const path = require("path");
const HappyPack = require('happypack');
const os = require('os');
const happyThreadPool = HappyPack.ThreadPool({
    size: os
        .cpus()
        .length
});

const ruleChildren = (loader) => loader.use || loader.oneOf || Array.isArray(loader.loader) && loader.loader || []

const findIndexAndRules = (rulesSource, ruleMatcher) => {
    let result = undefined
    const rules = Array.isArray(rulesSource) ? rulesSource : ruleChildren(rulesSource)
    rules.some((rule, index) => result = ruleMatcher(rule) ? {index, rules} : findIndexAndRules(ruleChildren(rule), ruleMatcher))
    return result
}

const createLoaderMatcher = (loader) => (rule) => rule.loader && rule.loader.indexOf(`${path.sep}${loader}${path.sep}`) !== -1
const loaderMatcher = createLoaderMatcher('babel-loader')

const addBeforeRule = (config, ruleMatcher, loader) => {
    const rulesSource = config.module.rules
    const {index, rules} = findIndexAndRules(rulesSource, ruleMatcher)
    const babelLoader = rules[index]
    config.plugins.push(
        new HappyPack({
            // 用id来标识 happypack处理类文件
            id: 'happyBabel',
            // 如何处理 用法和loader 的配置一样
            loaders: [
                babelLoader
            ],
            // 共享进程池
            threadPool: happyThreadPool,
            // 允许 HappyPack 输出日志
            verbose: true
        }),
    )
    rules.splice(index, 0, {
        ...babelLoader,
        ...{loader: loader},
        ...{options: {
            id: 'happyBabel',
            ...babelLoader.options
            }
        }
    })
}

module.exports = function (config, env) {
    addBeforeRule(config, loaderMatcher, 'happypack/loader')

    return config
}