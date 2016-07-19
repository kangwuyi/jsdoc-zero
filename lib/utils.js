var fs     = require('fs'),
    path   = require('path'),
    mkdirp = require('mkdirp'),
    _      = require('underscore');

/**
 * verification path
 * @description 验证文件夹的全局路径是否存在
 * @param path
 * @returns {object}
 */
exports.verificationPath = verificationPath;
function verificationPath(path) {
    // 判断路径是否存在
    if (!fs.existsSync(path)) {
        return {status: false};
    } else {
        return {status: true};
    }
};
/**
 *
 * @param outputGlobalPath
 */
exports.creatOutputGlobalPath = function (outputGlobalPath) {
    mkdirp.sync(outputGlobalPath);
    console.log('start creat [' + outputGlobalPath + '] folder');
};
/**
 *
 * @param outputGlobalPath
 * @returns {boolean}
 */
exports.deteleOutputGlobalPath = function (outputGlobalPath) {

    try {
        iterator(outputGlobalPath);
        console.log('detele [' + outputGlobalPath + '] folder');
        return true;
    } catch (error) {
        if (error.code === "ENOENT") throw error;
        return false;
    }
    function iterator(param) {

        var fsStat = fs.statSync(param);

        if (fsStat.isDirectory()) {

            _.each(fs.readdirSync(param), function (item) {
                iterator(path.join(param, item));
            });
            fs.rmdirSync(param);
        } else if (fsStat.isFile()) {
            fs.unlinkSync(param); //直接删除文件
        }
    }
};
/**
 * 处理路径列表，对路径进行补全
 * @name handlePathList
 * @param folderProjectPath {string} 文件夹的项目路径
 * @param outputProjectPath {string}
 * @param folderProjectPathIndex {number}
 * @param folderProjectPathList {array}
 * @return {object}
 */
exports.handlePathList = function (folderProjectPath, folderProjectPathIndex, folderProjectPathList, outputProjectPath) {

    try {
        var pathReadingCache = fs.statSync(path.resolve(folderProjectPath));
        if (pathReadingCache.isDirectory() || pathReadingCache.isFile()) {
            return {
                sourceProjectPath     : rlPath(folderProjectPath),
                sourceGlobalPath      : path.resolve(folderProjectPath),
                generateProjectPath   : rlPath(path.join(outputProjectPath, folderProjectPath)),
                generateGlobalPath    : path.resolve(outputProjectPath, folderProjectPath),
                folderProjectPathIndex: folderProjectPathIndex,
                folderProjectPathList : _.map(folderProjectPathList, function (item) {
                    return rlPath(item);
                })
            };
        } else {
            console.log(folderProjectPath);
            console.log('路径存在，但既不是文件，也不是文件夹');
            console.log(pathReadingCache);
            process.exit(1);
        }
    } catch (err) {
        if (err.code == 'ENOENT') {
            console.log(folderProjectPath);
            console.log(err.name);
            console.log('路径不存在');
        } else {
            console.log(folderProjectPath);
            console.log('错误：' + err);
        }
        throw err;
    }
};
/**
 * 处理路径最左和最右的斜杠
 * @example rlPath('/a/b/c\\d\\'); ==> 'a/b/c\\d'
 * @param path
 * @returns {*|{gte, gt, lte, lt}|string|void|{and, or}|XML}
 */
exports.rlPath = rlPath;
function rlPath(path) {
    return path.replace(/^[\/|\\\\]|[\/|\\\\]$/g, '')
}
