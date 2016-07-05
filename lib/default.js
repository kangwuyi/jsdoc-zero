'use strict';

var fs            = require('fs'),
    path          = require('path'),
    swig          = require('swig'),
    uuid          = require('uuid'),
    _             = require('underscore'),
    mkdirp        = require('mkdirp'),
    underscoreStr = require('underscore.string'),
    markdown      = require('marked').parse,
    dox           = require('dox'),
    merge         = require('./merge'),
    child_process = require('child_process');


merge(_, {str: underscoreStr});
/**
 * 获得模板页面
 * @returns {{section: *, api: *, doc: *, configuration: *}}
 * @api private
 */
var getTemplates                   = {
    'api'      : fs.readFileSync(path.join(__dirname, '../templates/api.html'), 'utf8'),
    'pageList' : fs.readFileSync(path.join(__dirname, '../templates/pageList.html'), 'utf8'),
    'markdown' : fs.readFileSync(path.join(__dirname, '../templates/markdown.html'), 'utf8'),
    'indexZero': fs.readFileSync(path.join(__dirname, '../templates/indexZero.html'), 'utf8')
};
/**
 * 生成文件相关的数组收集容器
 * @type {Array}
 */
var dirsArrContainer               = [];
/**
 * 收集 markdown 文件索引
 * @type {Array}
 */
var markdownFileListIndexContainer = [];
/**
 * 收集 markdown 文件
 * @type {Array}
 */
var dirsMarkdownArrContainer       = [];
/**
 * 收集文件索引对象的参数
 * @type {Array}
 */
var dirsFileArrContainer           = [];
function dirsArrContainerIterator(waitCreatFileObject, dirs) {
    /**
     * 收集目录
     * @ignore true
     */
    dirs.unshift(waitCreatFileObject);
}


/**
 * 检查路径是否存在
 * @param waitForThePathToCheck {string} 等待检查的路径
 * @returns {{status: boolean}}
 * @api private
 */
function checkPath(waitForThePathToCheck) {
    if (fs.existsSync(waitForThePathToCheck)) {
        return {status: true};
    } else {
        return {status: false};
    }
}
/**
 * 递归遍历路径下的文件
 * @param pathIndexCompletion
 * @param excludeOutputPathCompletion
 * @param loadConfigFiled
 * @param callback
 * @returns {*}
 */
function walk(pathIndexCompletion, excludeOutputPathCompletion, loadConfigFiled, callback) {

    /**
     * 处理目录下文件夹列表
     */
    var dirList         = fs.readdirSync(pathIndexCompletion);
    var outputPathCache = path.resolve(loadConfigFiled.source.output + _.str.strRight(pathIndexCompletion, loadConfigFiled.projectHomePath));

    if (!fs.existsSync(outputPathCache)) {

        if (_.indexOf(excludeOutputPathCompletion, outputPathCache) === -1) {
            console.log('开始创建 [' + outputPathCache + '] 目录');
            mkdirp.sync(outputPathCache);
            console.log('----创建 [' + outputPathCache + '] 目录成功');

            dirsFileArrContainer.push({
                writeFileSyncPath: path.join(outputPathCache, 'index_jsdoc_zero_menu.html'),
                render           : {
                    locals  : {
                        name   : path.join(_.str.strRight(outputPathCache, path.join(loadConfigFiled.projectHomePath, loadConfigFiled.source.output)), 'index_jsdoc_zero_menu.html'),
                        content: {
                            outPath : _.str.strRight(outputPathCache, loadConfigFiled.projectHomePath),   //==>/doc/dox
                            linkList: [],
                            dirList : _.compact(_.map(fs.readdirSync(pathIndexCompletion), function (item) {
                                if (fs.statSync(path.join(pathIndexCompletion, item)).isDirectory()
                                    && _.indexOf(loadConfigFiled.source.exclude, _.str.strRight(path.join(pathIndexCompletion, item), loadConfigFiled.projectHomePath).substring(1)) === -1) {
                                    return item
                                }
                            }))  //==> [ 'cc' ]
                        }
                    },
                    filename: _.str.strRight(outputPathCache, loadConfigFiled.projectHomePath) + '/index_jsdoc_zero_menu.html'
                }
            });
        }
    }
    /**
     * 先把路径下文件取出 callback(pathIndexCompletion)
     */
    var filesCache = callback(pathIndexCompletion);
    _.map(dirList, function (item) {
        if (fs.statSync(path.join(pathIndexCompletion, item)).isDirectory()) {

            var outputChildrenPathCache = path.resolve(loadConfigFiled.source.output + _.str.strRight(path.join(pathIndexCompletion, item), loadConfigFiled.projectHomePath));
            if (_.indexOf(excludeOutputPathCompletion, outputChildrenPathCache) === -1) {
                filesCache.childDir.push(walk(path.join(pathIndexCompletion, item), excludeOutputPathCompletion, loadConfigFiled, callback));
            }

        }
    });
    return filesCache;
}
/**
 * 获得文件列表
 * @param includePathChildrenDirCompletion
 * @param excludePathCompletion
 * @param suffixList
 * @param callabck
 * @returns {Array}
 */

function getFileList(includePathChildrenDirCompletion, excludePathCompletion, suffixList, callabck) {

    var getFileListInDir = [];
    suffixList           = suffixList.concat(['.md', '.markdown', '.MARKDOWN', '.MD']);

    if (_.indexOf(excludePathCompletion, includePathChildrenDirCompletion) === -1) {
        fs.readdirSync(includePathChildrenDirCompletion).filter(function (item) {
            return _.indexOf(suffixList, path.extname(item)) !== -1;
        }).map(function (item) {

            return {
                fileNameHasExtname: item,
                fileNameNoExtname : path.basename(item, path.extname(item))
            }
        }).forEach(function (fileNameObject) {
            callabck(fileNameObject, getFileListInDir, includePathChildrenDirCompletion);
        });
        return getFileListInDir;
    }

}
/**
 * 处理后得到相关目录下文件 json 格式数据
 * @param includePathCompletion {array}
 * @param excludePathCompletion {array}
 * @param loadConfigFiled {object}
 * @param callback {function}
 * @api private
 * @returns {{}}
 */
var getFileJsonAPIs = function (includePathCompletion, excludePathCompletion, loadConfigFiled, callback) {

    var excludeOutputPathCompletion = _.map(excludePathCompletion, function (item) {
        return path.resolve(loadConfigFiled.source.output + _.str.strRight(item, loadConfigFiled.projectHomePath));
    });

    return _.map(includePathCompletion, function (item) {
        if (!checkPath(item)) {
            return false;
        }
        return walk(item, excludeOutputPathCompletion, loadConfigFiled, function (pathIndex) {
            return callback(pathIndex);
        });
    });
};
/**
 * 从Markdown中提取标题列表
 * @return {Array} 返回标题列表
 */
const getIndexs     = function (section, level, callback) {
    level         = level || 0; // 默认从 0 开始
    level         = level > 6 ? 6 : level; // 最大到6级标题
    level         = level < 0 ? 0 : level; // 最小到1级标题
    callback      = callback || function (item, level) {
            return true;
        };
    var arrayList = [];
    var matched   = section.match(/.*\r?\n(\=+)|#+\s+(.*)/gm);

    if (matched) {
        matched.map(function (item) {
            if (/#+/.test(item)) {
                var levelCache = item.match(/#+/)[0].length;
                if (levelCache > level && levelCache < level + 2) {
                    var titleCache = item.replace(/#+\s+/, '');

                    arrayList.push({
                        list    : {level: levelCache, title: titleCache},
                        children: getIndexs(section, levelCache + 1, callback)
                    });
                }

            } else {
                arrayList.push({
                    list    : {level: level, title: item.split(/\n/)[0]},
                    children: []
                });

            }
        })
    } else {
        return [];
    }
    return arrayList;
};
/**
 * 主程序入口
 * @param loadConfigFiled
 * @param callback
 */
module.exports = function (loadConfigFiled, callback) {
    var includePathCompletion = _.map(loadConfigFiled.source.include, handlePathList),
        excludePathCompletion = _.map(loadConfigFiled.source.exclude, handlePathList),
        outputPathCompletion  = path.join(loadConfigFiled.projectHomePath, loadConfigFiled.source.output);

    deleteOldDir(outputPathCompletion);

    var generateAllJsFileInfoForJson   = getFileJsonAPIs(includePathCompletion, excludePathCompletion, loadConfigFiled, function (includePathChildrenDirCompletion) {
        return {
            pathName: includePathChildrenDirCompletion,    //==>/home/kang/work/kahn1990-object-server/doc/test
            fileList: getFileList(
                includePathChildrenDirCompletion,
                excludePathCompletion,
                loadConfigFiled.source.suffix,
                function (fileNameObject, getFileListInDir, includePathChildrenDirCompletion) {
                    var outputFilePathCompletion = path.resolve(outputPathCompletion + _.str.strRight(includePathChildrenDirCompletion, loadConfigFiled.projectHomePath)),
                        outputFileExtNameCache   = path.extname(fileNameObject.fileNameHasExtname);

                    if (_.indexOf(['.md', '.markdown', '.MARKDOWN', '.MD'], outputFileExtNameCache) !== -1) {
                        var MarkdownFileContentCache = fs.readFileSync(path.join(includePathChildrenDirCompletion, fileNameObject.fileNameHasExtname), 'utf8');
                        dirsMarkdownArrContainer.push({
                            name   : _.str.strRight(path.join(includePathChildrenDirCompletion, fileNameObject.fileNameHasExtname), outputFilePathCompletion),
                            content: markdown(MarkdownFileContentCache),
                            indexs : getIndexs(MarkdownFileContentCache, 0, function (item, i) {
                                return item.level > (i - 1);
                            })
                        })
                    } else {
                        if (fs.existsSync(outputFilePathCompletion)) {
                            var fileObjectCache = {
                                fileType          : path.extname(fileNameObject.fileNameHasExtname),
                                fileNameHasExtname: fileNameObject.fileNameHasExtname, //==>testjs.js
                                fileNameNoExtname : fileNameObject.fileNameNoExtname,  //==>testjs
                                sourceFilePath    : includePathChildrenDirCompletion,   //==>/home/kang/work/kahn1990-object-server/doc/test
                                outputPath        : outputPathCompletion,    //==>/home/kang/work/kahn1990-object-server/doc/dox
                                outputFilePath    : outputFilePathCompletion,    //==>/home/kang/work/kahn1990-object-server/doc/dox/doc/test
                                generateFilePath  : path.join(outputFilePathCompletion, fileNameObject.fileNameNoExtname + '.html'),   //==>/home/kang/work/kahn1990-object-server/doc/dox/doc/test/testjs.html
                                content           : dox.parseComments(fs.readFileSync(path.join(includePathChildrenDirCompletion, fileNameObject.fileNameHasExtname), 'utf8'), {}),
                                uuid              : uuid.v4()
                            };
                            dirsArrContainerIterator(fileObjectCache, dirsArrContainer)
                        }

                        getFileListInDir.push(fileObjectCache)
                    }

                }),
            childDir: []
        };
    });
    var getProjectHomePathMarkdownFile = getFileList(loadConfigFiled.projectHomePath, outputPathCompletion, [], function (fileNameObject, getFileListInDir, includePathChildrenDirCompletion) {
        var MarkdownFileContentCache = fs.readFileSync(path.join(includePathChildrenDirCompletion, fileNameObject.fileNameHasExtname), 'utf8');
        dirsMarkdownArrContainer.push({
            name   : _.str.strRight(path.join(includePathChildrenDirCompletion, fileNameObject.fileNameHasExtname), outputPathCompletion),
            content: markdown(MarkdownFileContentCache),
            indexs : getIndexs(MarkdownFileContentCache, 0, function (item, i) {
                return item.level > (i - 1);
            })
        });
    });
    creatFileFuncByMarkdown(loadConfigFiled.projectHomePath, outputPathCompletion, dirsMarkdownArrContainer);
    creatHtmlIndexFile(loadConfigFiled.projectHomePath, outputPathCompletion, includePathCompletion);
    creatincludePathFileFuncByHtml(loadConfigFiled.projectHomePath, outputPathCompletion, includePathCompletion);
    creatFileFuncByHtml(dirsArrContainer);

    child_process.execFileSync('cp', ['-R', path.join(__dirname, '../templates/jsDoc_assets'), path.join(outputPathCompletion, 'jsDoc_assets')]);


    //console.log(dirsMarkdownArrContainer)
    /*    console.log(dirsArrContainer)
     console.log('--------------------------')
     console.log(generateAllJsFileInfoForJson)*/
};
/**
 * 生成 markdown 文件
 * @param projectHomePath
 * @param outputPathCompletion
 * @param dirsMarkdownArrContainer
 */
function creatFileFuncByMarkdown(projectHomePath, outputPathCompletion, dirsMarkdownArrContainer) {
    _.each(dirsMarkdownArrContainer, function (item) {
        var markdownFileNameCache = _.str.words(_.str.strRight(path.join(item.name), projectHomePath), /[\/|\-\\.]/).join('_');

        console.log('开始写入 markdown 文件[' + path.join(outputPathCompletion, markdownFileNameCache + '.html') + ']');
        markdownFileListIndexContainer.push({
            name: _.str.strRight(path.join(item.name), projectHomePath),
            path: markdownFileNameCache + '.html'
        });
        fs.writeFileSync(
            path.join(outputPathCompletion, markdownFileNameCache + '.html'),
            swig.render(
                getTemplates.markdown,
                {
                    locals  : {
                        name   : path.join(outputPathCompletion, markdownFileNameCache + '.html'),
                        content: item.content,
                        indexs : item.indexs
                    },
                    filename: path.join(outputPathCompletion, markdownFileNameCache + '.html')
                }
            ),
            'utf8'
        );
        console.log('----写入 markdown 文件 [' + path.join(outputPathCompletion, markdownFileNameCache + '.html') + '] 完成');
    });
}
/**
 * 生成文档
 */
function creatFileFuncByHtml(dirsArrContainer) {

    /**
     * 处理文件索引
     */
    _.each(_.uniq(_.pluck(dirsArrContainer, 'outputFilePath')), function (value) {
        /**
         * 返回文件列表
         */

        var pageIndexList = _.without(_.map(dirsArrContainer, function (item) {
            if (value === item.outputFilePath) {

                return _.str.strRight(item.generateFilePath, value);
            } else {
            }
            return false;
        }), false);

        dirsFileArrContainer.push({
            writeFileSyncPath: value + '/index_jsdoc_zero_menu.html',
            render           : {
                locals  : {
                    name   : _.str.strRight(value + '/index_jsdoc_zero_menu.html', dirsArrContainer[0].outputPath),
                    content: {
                        outPath : _.str.strRight(value, dirsArrContainer[0].outputPath),   //==>/doc/dox
                        linkList: pageIndexList,    //==> [ '/testjs4.html' ]
                        dirList : _.without(
                            _.map(fs.readdirSync(value), function (dirIndexItem) {
                                if (fs.statSync(value + '/' + dirIndexItem).isDirectory()) return dirIndexItem
                            }),
                            undefined
                        )  //==> [ 'cc' ]
                    }
                },
                filename: _.str.strRight(value, dirsArrContainer[0].outputPath) + '/index_jsdoc_zero_menu.html'
            }
        });
    });

    _.mapObject(_.indexBy(dirsFileArrContainer, 'writeFileSyncPath'), function (val, key) {
        console.log('开始写入子文件夹主页面空索引 [' + key + ']');
        fs.writeFileSync(
            key,
            swig.render(
                getTemplates.pageList,
                val.render
            ),
            'utf8');
        console.log('----写入子文件夹主页面索引 [' + key + '] 完成');
    });


    _.each(dirsArrContainer, function (item) {
        console.log('开始写入 ' + item.fileType.substring(1) + ' 文件 [' + item.generateFilePath + ']');
        fs.writeFileSync(
            item.generateFilePath,
            swig.render(
                getTemplates.api,
                {
                    locals  : {
                        name   : item.fileNameHasExtname,
                        path   : {
                            filePath: _.str.strRight(item.generateFilePath, item.outputPath)
                        },
                        content: item.content
                    },
                    filename: item.fileNameHasExtname
                }
            ),
            'utf8');
        console.log('----写入 ' + item.fileType.substring(1) + ' 文件 [' + item.generateFilePath + '] 结束');

    });
}
/**
 * 生成目录中可能存在的文件夹索引
 * @param projectHomePath
 * @param outputPathCompletion
 * @param includePathCompletion
 */
function creatincludePathFileFuncByHtml(projectHomePath, outputPathCompletion, includePathCompletion) {
    _.each(
        _.without(
            _.map(includePathCompletion, function (item) {
                var includePathCache = _.str.strRight(item, projectHomePath).substring(1);
                if (_.str.include(includePathCache, '/')) return includePathCache;
            }),
            undefined
        ),
        function (item) {
            _.reduce(
                item.split("/"),
                function (memo, num) {
                    var pathChildrenCache = path.join(outputPathCompletion, _.isNumber(memo) ? '' : memo, num);
                    console.log('开始生成子路径主页面索引 [' + path.join(pathChildrenCache, 'index_jsdoc_zero_menu.html') + ']');
                    fs.writeFileSync(
                        path.join(pathChildrenCache, 'index_jsdoc_zero_menu.html'),
                        swig.render(
                            getTemplates.pageList,
                            {
                                locals  : {
                                    name   : _.str.strRight(pathChildrenCache, projectHomePath) + '/index_jsdoc_zero_menu.html',
                                    content: {
                                        outPath: [],   //==>/doc/dox
                                        dirList: [] //==> [ 'cc' ]
                                    }
                                },
                                filename: _.str.strRight(pathChildrenCache, projectHomePath) + '/index_jsdoc_zero_menu.html'
                            }
                        ),
                        'utf8');
                    console.log('----生成子路径主页面索引 [' + path.join(pathChildrenCache, 'index_jsdoc_zero_menu.html') + '] 完成');
                    return memo + num;
                },
                ''
            );
        });
}
/**
 * 生成主页索引，待修改
 * @param projectHomePath
 * @param outputPathCompletion
 * @param includePathCompletion
 */
function creatHtmlIndexFile(projectHomePath, outputPathCompletion, includePathCompletion) {

    console.log('开始生成主页面索引 [' + path.join(outputPathCompletion, 'index_jsdoc_zero_menu.html') + ']');
    fs.writeFileSync(
        path.join(outputPathCompletion, 'index_jsdoc_zero_menu.html'),
        swig.render(
            getTemplates.indexZero,
            {
                locals  : {
                    name   : 'index_jsdoc_zero_menu.html',
                    content: {
                        outPath : _.str.strRight(outputPathCompletion, projectHomePath),   //==>/doc/dox
                        linkList: markdownFileListIndexContainer,
                        dirList : _.map(includePathCompletion, function (item) {
                            return _.str.strRight(item, projectHomePath);
                        })  //==> [ 'cc' ]
                    }
                },
                filename: _.str.strRight(outputPathCompletion, projectHomePath) + '/index_jsdoc_zero_menu.html'
            }
        ),
        'utf8');
    console.log('----生成主页面索引 [' + path.join(outputPathCompletion, 'index_jsdoc_zero_menu.html') + '] 完成');
}
/**
 * 处理路径列表，对路径进行补全
 * @name handlePathList
 * @param item {string}
 * @examples doc/test ==> /home/kang/work/kahn1990-object-server/doc/test
 */
function handlePathList(item) {
    var filePathCache = path.resolve(item);
    try {
        var statFileCache = fs.statSync(filePathCache);
        if (statFileCache.isDirectory() || statFileCache.isFile()) {
            return filePathCache;
        } else {
            console.log(item.red);
            console.log('路径存在，但既不是文件，也不是文件夹'.red);
            console.log(statFileCache.red);
            process.exit(1);
        }
    }
    catch (err) {
        if (err.code == 'ENOENT') {
            console.log(item.red);
            console.log(err.name.red);
            console.log('路径不存在');
        } else {
            console.log(item.red);
            console.log('错误：' + err.red);
        }
        throw err;
    }
}
/**
 * 删除输出目录并创建新的输出目录
 * @param {string} outputPathCompletion
 */
function deleteOldDir(outputPathCompletion) {
    var recursionDeteleAllOldDir  = function (outputPathCompletion) {
            var dirsArr = [];

            try {
                iterator(outputPathCompletion, dirsArr);

                _.each(dirsArr, function (item) {
                    fs.rmdirSync(item);
                });
                return true;
            } catch (error) {
                if (error.code === "ENOENT") throw error;
                return false;
            }

            function iterator(url, dirs) {
                var stat = fs.statSync(url);
                if (stat.isDirectory()) {
                    dirs.unshift(url);

                    _.each(fs.readdirSync(url), function (item) {
                        iterator(url + "/" + item, dirs);
                    });
                } else if (stat.isFile()) {
                    //直接删除文件
                    fs.unlinkSync(url);
                }
            }
        },
        creatOutputPathCompletion = function (outputPathCompletion) {
            console.log('开始创建 [' + outputPathCompletion + '] 目录');
            mkdirp.sync(outputPathCompletion);
            console.log('----创建 [' + outputPathCompletion + '] 目录成功');
        };
    // 判断路径是否存在
    if (!fs.existsSync(outputPathCompletion)) {
        creatOutputPathCompletion(outputPathCompletion);
    } else {
        console.log('开始删除 [' + outputPathCompletion + '] 目录');
        recursionDeteleAllOldDir(outputPathCompletion);
        console.log('----删除 [' + outputPathCompletion + '] 目录成功');
        creatOutputPathCompletion(outputPathCompletion);
    }
}

