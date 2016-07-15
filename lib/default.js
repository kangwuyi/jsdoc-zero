'use strict';

var fs = require('fs'),
    path = require('path'),
    swig = require('swig'),
    uuid = require('uuid'),
    _ = require('underscore'),
    mkdirp = require('mkdirp'),
    underscoreStr = require('underscore.string'),
    markdown = require('marked').parse,
    colors = require("colors"),
    crypto = require('crypto'),
    dox = require('dox'),
    merge = require('./merge'),
    child_process = require('child_process');


merge(_, {str: underscoreStr});
/**
 * 获得模板页面
 * @returns {{section: *, api: *, doc: *, configuration: *}}
 * @api private
 */
var getTemplates = {
    'api'      : fs.readFileSync(path.join(__dirname, '../templates/api.html'), 'utf8'),
    'pageList' : fs.readFileSync(path.join(__dirname, '../templates/pageList.html'), 'utf8'),
    'markdown' : fs.readFileSync(path.join(__dirname, '../templates/markdown.html'), 'utf8'),
    'indexZero': fs.readFileSync(path.join(__dirname, '../templates/indexZero.html'), 'utf8')
};
/**
 * 生成文件相关的数组收集容器
 * @type {Array}
 */
var dirsArrContainer = [];
/**
 * 收集 markdown 文件索引
 * @type {Array}
 */
var markdownFileListIndexContainer = [];
/**
 * 收集 markdown 文件
 * @type {Array}
 */
var dirsMarkdownArrContainer = [];
/**
 * 收集文件索引对象的参数
 * @type {Array}
 */
var dirsFileArrContainer = [];
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
 * @param sourcePathItem
 * @param excludePathListObject
 * @param callback
 * @returns {*}
 */
function walk(sourcePathItem, excludePathListObject, callback) {
    var generateGlobalPath = sourcePathItem.generateGlobalPath,
        generateProjectPath = sourcePathItem.generateProjectPath,
        sourceGlobalPath = sourcePathItem.sourceGlobalPath,
        sourceProjectPath = sourcePathItem.sourceProjectPath,
        excludeFolderProjectPathList = excludePathListObject[0] ? excludePathListObject[0].folderProjectPathList : [];

    if (!fs.existsSync(generateGlobalPath)) {

        if (_.indexOf(excludeFolderProjectPathList, sourceProjectPath) === -1) {
            mkdirp.sync(generateGlobalPath);
            console.log('start creat [' + generateGlobalPath + '] folder done');
            // 收集空目录下的 index.html 索引文件内容
            var generateGlobalPathFile = path.join(generateGlobalPath, 'index.html'),
                generateProjectPathFile = path.join(generateProjectPath, 'index.html');

            dirsFileArrContainer.push({
                writeFileSyncPath: generateGlobalPathFile,
                render           : {
                    locals  : {
                        fileName              : 'index.html',
                        sourceProjectPath     : sourceProjectPath,
                        generateProjectPath   : generateProjectPath,
                        staticLoadRelativePath: path.relative(path.dirname(generateGlobalPathFile), path.join(_.str.strLeft(generateGlobalPath, generateProjectPath), _.str.strLeft(generateProjectPath, sourceProjectPath))),
                        content               : {
                            linkList: [],
                            dirList : _.compact(_.map(fs.readdirSync(sourceGlobalPath), function (item) {
                                if (fs.statSync(path.join(sourceGlobalPath, item)).isDirectory()
                                    && _.indexOf(excludeFolderProjectPathList, path.join(sourceProjectPath, item)) === -1) {
                                    return item
                                }
                            }))  //==> [ 'cc' ]
                        }
                    },
                    filename: generateProjectPathFile
                }
            });
        }
    }
    /**
     * 先把路径下文件取出 callback(sourceGlobalPath)
     */
    var filesCache = callback(sourcePathItem);
    /**
     * 处理目录下文件夹列表
     */
    _.map(fs.readdirSync(sourceGlobalPath), function (item) {
        if (fs.statSync(path.join(sourceGlobalPath, item)).isDirectory()) {

            if (_.indexOf(excludeFolderProjectPathList, path.join(sourceProjectPath, item)) === -1) {
                filesCache.childDir.push(walk(
                    {
                        sourceProjectPath  : path.join(sourceProjectPath, item),
                        sourceGlobalPath   : path.join(sourceGlobalPath, item),
                        generateProjectPath: path.join(generateProjectPath, item),
                        generateGlobalPath : path.join(generateGlobalPath, item)
                    },
                    excludePathListObject,
                    callback
                ));
            }

        }
    });
    return filesCache;
}
/**
 * 获得文件列表
 * @param sourcePathParam
 * @param excludePathListObject
 * @param suffixList
 * @param callback
 * @returns {Array}
 */

function getFileList(sourcePathParam, excludePathListObject, suffixList, callback) {
    var sourceGlobalPath = sourcePathParam.sourceGlobalPath,
        sourceProjectPath = sourcePathParam.sourceProjectPath,
        getFileListInDir = [];
    suffixList = suffixList.concat(['.md', '.markdown', '.MARKDOWN', '.MD']);
    excludePathListObject = excludePathListObject[0] ? excludePathListObject[0].folderProjectPathList : [];

    if (_.indexOf(excludePathListObject, sourceProjectPath) === -1) {

        fs.readdirSync(sourceGlobalPath).filter(function (item) {
            return _.indexOf(suffixList, path.extname(item)) !== -1;
        }).map(function (item) {

            return {
                fileHasExtname: item,
                fileNoExtname : path.basename(item, path.extname(item)),
                fileExtname   : path.extname(item)
            }
        }).forEach(function (fileNameObject) {
            callback(fileNameObject, getFileListInDir);
        });
        return getFileListInDir;
    }
}
/**
 * 处理后得到相关目录下文件 json 格式数据
 * @param sourcePathListObject {array}
 * @param excludePathListObject {array}
 * @param callback {function}
 * @api private
 * @returns {{}}
 */
var getFileJsonAPIs = function (sourcePathListObject, excludePathListObject, callback) {
    return _.map(sourcePathListObject, function (sourcePathItem) {
        if (!checkPath(sourcePathItem.sourceGlobalPath)) {
            return false;
        }
        return walk(sourcePathItem, excludePathListObject, function (sourcePathItemParam) {
            return callback(sourcePathItemParam);
        });
    });
};
/**
 * 从Markdown中提取标题列表
 * @return {Array} 返回标题列表
 */
const getIndexs = function (section, level, callback) {
    level = level || 0; // 默认从 0 开始
    level = level > 6 ? 6 : level; // 最大到6级标题
    level = level < 0 ? 0 : level; // 最小到1级标题
    callback = callback || function (item, level) {
            return true;
        };
    var arrayList = [];
    var matched = section.match(/.*\r?\n(\=+)|#+\s+(.*)/gm);

    if (matched) {
        matched.map(function (item) {
            if (/#+/.test(item)) {
                var levelCache = item.match(/#+/)[0].length;
                if (levelCache > level && levelCache < level + 2) {
                    var titleCache = item.replace(/#+\s+/, '');

                    arrayList.push({
                        list    : {
                            level: levelCache,
                            title: titleCache
                        },
                        children: getIndexs(section, levelCache + 1, callback)
                    });
                }

            } else {
                arrayList.push({
                    list    : {
                        level: level,
                        title: item.split(/\n/)[0]
                    },
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
 * @param options
 * @param callback
 */
module.exports = function (options, callback) {

    var sourcePathListObject = _.map(options.source.include, function () {
            return handlePathList.apply(this, Array.prototype.slice.call(arguments).concat(options.source.output));
        }),   // 源文件夹队列
        excludePathListObject = _.map(options.source.exclude, function () {
            return handlePathList.apply(this, Array.prototype.slice.call(arguments).concat(options.source.output));
        }),  // 过滤文件夹队列
        outputGlobalPath = path.join(options.projectHomePath, options.source.output);   // 输出文件夹

    verificationOutputGlobalPath(outputGlobalPath);

    var generateAllJsFileInfoForJson = getFileJsonAPIs(sourcePathListObject, excludePathListObject, function (sourcePathParam) {
        var generateGlobalPath = sourcePathParam.generateGlobalPath,
            generateProjectPath = sourcePathParam.generateProjectPath,
            sourceGlobalPath = sourcePathParam.sourceGlobalPath,
            sourceProjectPath = sourcePathParam.sourceProjectPath;

        return {
            pathName: sourceGlobalPath,    //==>/home/kang/work/kahn1990-object-server/lib
            fileList: getFileList(
                sourcePathParam,
                excludePathListObject,
                options.source.suffix,
                function (fileNameObject, getFileListInDir) {
                    var sourceGlobalPathFile = path.join(sourceGlobalPath, fileNameObject.fileHasExtname),
                        sourceFileContentCache = fs.readFileSync(sourceGlobalPathFile, 'utf8'),
                        sourceFileNameBuffer = new Buffer(path.join(sourceProjectPath, fileNameObject.fileHasExtname)).toString('base64'),
                        generateFile = sourceFileNameBuffer + '.html';
                    fileNameObject.generateFile = generateFile;
                    var fileObjectCache = {
                        generatePathFile      : path.join(generateGlobalPath, generateFile),
                        generateProjectPath   : generateProjectPath,
                        generateGlobalPath    : generateGlobalPath,
                        fileNameObject        : fileNameObject,
                        sourceProjectPath     : sourceProjectPath,
                        staticLoadRelativePath: path.relative(generateGlobalPath, outputGlobalPath)
                    };


                    if (_.indexOf(['.md', '.markdown', '.MARKDOWN', '.MD'], fileNameObject.fileExtname) !== -1) {
                        fileObjectCache.content = markdown(sourceFileContentCache);
                        fileObjectCache.indexs = getIndexs(sourceFileContentCache, 0, function (item, i) {
                            return item.level > (i - 1);
                        });
                        dirsMarkdownArrContainer.push(fileObjectCache);
                    } else {
                        if (fs.existsSync(generateGlobalPath)) {
                            fileObjectCache.content = dox.parseComments(sourceFileContentCache, {});
                            dirsArrContainerIterator(fileObjectCache, dirsArrContainer)
                        }
                        getFileListInDir.push(fileObjectCache)
                    }

                }),
            childDir: []
        };
    });

    var getProjectHomePathMarkdownFile = getFileList(
        {
            sourceProjectPath     : '',
            sourceGlobalPath      : options.projectHomePath,
            generateProjectPath   : options.source.output,
            generateGlobalPath    : outputGlobalPath,
            folderProjectPathIndex: 0,
            folderProjectPathList : []
        },
        excludePathListObject,
        [],
        function (fileNameObject) {
            var sourceGlobalPathFile = path.join(options.projectHomePath, fileNameObject.fileHasExtname),
                sourceFileContentCache = fs.readFileSync(sourceGlobalPathFile, 'utf8'),
                sourceFileNameBuffer = new Buffer(path.join(fileNameObject.fileHasExtname)).toString('base64'),
                generateFile = sourceFileNameBuffer + '.html';
            fileNameObject.generateFile = generateFile;
            dirsMarkdownArrContainer.push({
                generatePathFile      : path.join(outputGlobalPath, generateFile),
                generateProjectPath   : options.source.output,
                generateGlobalPath    : outputGlobalPath,
                fileNameObject        : fileNameObject,
                sourceProjectPath     : '.',
                staticLoadRelativePath: '.',
                content               : markdown(sourceFileContentCache),
                indexs                : getIndexs(sourceFileContentCache, 0, function (item, i) {
                    return item.level > (i - 1);
                })
            });
        });
    creatFileFuncByMarkdown(options.projectHomePath, outputGlobalPath, dirsMarkdownArrContainer);
    creatHtmlIndexFile(options.projectHomePath, outputGlobalPath, sourcePathListObject);
    creatincludePathFileFuncByHtml(options.projectHomePath, outputGlobalPath, sourcePathListObject);
    creatFileFuncByHtml(options.projectHomePath, outputGlobalPath, dirsArrContainer);
    writeJsdocListFile(outputGlobalPath, generateAllJsFileInfoForJson);
    child_process.execFileSync('cp', ['-R', path.join(__dirname, '../templates/jsdoc_static'), path.join(outputGlobalPath, 'jsdoc_static')]);
    callback();
};

function writeJsdocListFile(outputGlobalPath, generateAllJsFileInfoForJson) {
    var generateAllJsFileInfoForJsonCache = [];
    eachFuncObj(generateAllJsFileInfoForJson);

    function eachFuncObj(eachFuncObjParam) {
        _.each(eachFuncObjParam, function (item) {
            queryFuncName(item.fileList);
            if (item.childDir.length > 0) {
                eachFuncObj(item.childDir);
            }
        });
    }

    function queryFuncName(itemParam) {
        _.each(itemParam, function (fileItem) {
            _.each(fileItem.content, function (fileContentItem) {
                if (fileContentItem.ctx) {
                    if (fileContentItem.ctx.name) {
                        generateAllJsFileInfoForJsonCache.push({
                            staticLoadRelativePath: fileItem.staticLoadRelativePath,
                            sourceProjectPath     : fileItem.sourceProjectPath,
                            fileNameObject        : fileItem.fileNameObject,
                            name                  : fileContentItem.ctx.name,
                            line                  : fileContentItem.line,
                            codeStart             : fileContentItem.codeStart
                        })
                    }
                }
            });
        });
    }

    fs.writeFileSync(
        path.join(outputGlobalPath, 'jsdocList.js'),
        'var jsdocList = ' + JSON.stringify(generateAllJsFileInfoForJsonCache),
        'utf8'
    );
}
/**
 * 生成 markdown 文件
 * @param projectHomePath
 * @param outputGlobalPath
 * @param dirsMarkdownArrContainer
 */
function creatFileFuncByMarkdown(projectHomePath, outputGlobalPath, dirsMarkdownArrContainer) {
    _.each(dirsMarkdownArrContainer, function (item) {
        item.fileNameObject.relativeProjectPathFile = path.relative(outputGlobalPath,item.generatePathFile);
        markdownFileListIndexContainer.push(item.fileNameObject);

        fs.writeFileSync(
            item.generatePathFile,
            swig.render(
                getTemplates.markdown,
                {
                    locals  : {
                        fileNameObject        : item.fileNameObject,
                        sourceProjectPath     : item.sourceProjectPath,
                        generateProjectPath   : item.generateProjectPath,
                        staticLoadRelativePath: item.staticLoadRelativePath,
                        content               : item.content,
                        indexs                : item.indexs
                    },
                    filename: _.str.strRight(item.generatePathFile, outputGlobalPath)
                }
            ),
            'utf8'
        );
        console.log('start write markdown file [' + item.generatePathFile + '] done');
    });
}
// 生成文档
function creatFileFuncByHtml(projectHomePath, outputGlobalPath, dirsArrContainer) {
    // 处理文件索引
    _.each(_.uniq(_.pluck(dirsArrContainer, 'generateProjectPath')), function (value) {
        var generateFileGlobalPath = path.join(projectHomePath, value, 'index.html'),
            generateFileProjectPath = path.join(value, 'index.html'),
            generateProjectPath = path.join(projectHomePath, value),
            pageIndexList = _.without(_.map(dirsArrContainer, function (item) {
                if (value === item.generateProjectPath) {
                    return item.fileNameObject;
                } else {
                }
                return false;
            }), false); // 返回文件列表

        dirsFileArrContainer.push({
            writeFileSyncPath: generateFileGlobalPath,
            render           : {
                locals  : {
                    fileName              : 'index.html',
                    sourceProjectPath     : path.relative(path.resolve(path.relative(projectHomePath, outputGlobalPath)), path.resolve(value)),
                    generateProjectPath   : path.relative(projectHomePath, path.resolve(value)),
                    staticLoadRelativePath: path.relative(path.dirname(generateFileGlobalPath), outputGlobalPath),
                    content               : {
                        linkList: pageIndexList,    //==> [ '/testjs4.html' ]
                        dirList : _.without(
                            _.map(fs.readdirSync(generateProjectPath), function (dirIndexItem) {
                                if (fs.statSync(path.join(generateProjectPath, dirIndexItem)).isDirectory()) return dirIndexItem
                            }),
                            undefined
                        )  //==> [ 'cc' ]
                    }
                },
                filename: _.str.strRight(generateFileProjectPath, outputGlobalPath)
            }
        });
    });

    _.mapObject(_.indexBy(dirsFileArrContainer, 'writeFileSyncPath'), function (val, key) {
        fs.writeFileSync(
            key,
            swig.render(
                getTemplates.pageList,
                val.render
            ),
            'utf8');
        console.log('start write subfolder index page [' + key + '] done');
    });

    _.each(dirsArrContainer, function (item) {

        fs.writeFileSync(
            item.generatePathFile,
            swig.render(
                getTemplates.api,
                {
                    locals  : {
                        fileNameObject        : item.fileNameObject,
                        sourceProjectPath     : item.sourceProjectPath,
                        generateProjectPath   : item.generateProjectPath,
                        staticLoadRelativePath: path.relative(path.dirname(item.generatePathFile), outputGlobalPath),
                        content               : item.content
                    },
                    filename: _.str.strRight(item.generatePathFile, outputGlobalPath)
                }
            ),
            'utf8');
        console.log('start write ' + item.fileNameObject.fileExtname + ' file [' + item.generatePathFile + '] done');
    });
}

/**
 * 生成目录中可能存在的文件夹索引
 * @param projectHomePath
 * @param outputGlobalPath
 * @param sourcePathListObject
 */
function creatincludePathFileFuncByHtml(projectHomePath, outputGlobalPath, sourcePathListObject) {
    _.each(
        _.without(
            _.map(sourcePathListObject, function (item) {
                var itemSourceProjectPath = item.sourceProjectPath;
                itemSourceProjectPath = itemSourceProjectPath.match(/^\/|\/$/g);
                if (!itemSourceProjectPath && _.str.include(itemSourceProjectPath, '/')) return itemSourceProjectPath;
            }),
            undefined
        ),
        function (item) {
            _.reduce(
                item.split("/"),
                function (memo, num) {
                    var pathChildrenCache = path.join(outputGlobalPath, _.isNumber(memo) ? '' : memo, num),
                        generatePathFile = path.join(pathChildrenCache, 'index.html');

                    fs.writeFileSync(
                        generatePathFile,
                        swig.render(
                            getTemplates.pageList,
                            {
                                locals  : {
                                    fileName              : 'index.html',
                                    sourceProjectPath     : _.str.strRight(_.str.strRight(pathChildrenCache, projectHomePath), _.str.strRight(outputGlobalPath, projectHomePath)),
                                    generateProjectPath   : _.str.strRight(pathChildrenCache, projectHomePath),
                                    staticLoadRelativePath: path.relative(path.dirname(pathChildrenCache), outputGlobalPath),
                                    content               : {
                                        outPath: [],   //==>/doc/dox
                                        dirList: [] //==> [ 'cc' ]
                                    }
                                },
                                filename: path.join(_.str.strRight(pathChildrenCache, projectHomePath), 'index.html')
                            }
                        ),
                        'utf8');
                    console.log('start creat subpath index apge [' + generatePathFile + '] done');
                    return memo + num;
                },
                ''
            );
        });
}
/**
 * 生成主页索引，待修改
 * @param projectHomePath
 * @param outputGlobalPath
 * @param sourcePathListObject
 */
function creatHtmlIndexFile(projectHomePath, outputGlobalPath, sourcePathListObject) {
    var generatePathFile = path.join(outputGlobalPath, 'index.html');

    fs.writeFileSync(
        generatePathFile,
        swig.render(
            getTemplates.indexZero,
            {
                locals  : {
                    fileName              : 'index.html',
                    staticLoadRelativePath: '.',
                    content               : {
                        linkList: markdownFileListIndexContainer,
                        dirList : _.map(sourcePathListObject, function (item) {
                            return _.str.strRight(item.sourceProjectPath, projectHomePath);
                        })  //==> [ 'cc' ]
                    }
                },
                filename: path.join(_.str.strRight(outputGlobalPath, projectHomePath), 'index.html') // 这里的 ‘/’ 不做 win 处理
            }
        ),
        'utf8');
    console.log('start creat index home`s page [' + generatePathFile + '] done');
}
/**
 * 处理路径列表，对路径进行补全
 * @name handlePathList
 * @param folderProjectPath {string} 文件夹的项目路径
 * @param outputProjectPath {string}
 * @param folderProjectPathIndex {number}
 * @param folderProjectPathList {array}
 * @return {object}
 * @examples doc/test ==> /home/kang/work/kahn1990-object-server/doc/test
 */
function handlePathList(folderProjectPath, folderProjectPathIndex, folderProjectPathList, outputProjectPath) {

    try {
        var pathReadingCache = fs.statSync(path.resolve(folderProjectPath));
        if (pathReadingCache.isDirectory() || pathReadingCache.isFile()) {
            //path.resolve(loadConfigFiled.source.output + _.str.strRight(item, loadConfigFiled.projectHomePath));
            return {
                sourceProjectPath     : folderProjectPath,
                sourceGlobalPath      : path.resolve(folderProjectPath),
                generateProjectPath   : path.join(outputProjectPath, folderProjectPath),
                generateGlobalPath    : path.resolve(outputProjectPath, folderProjectPath),
                folderProjectPathIndex: folderProjectPathIndex,
                folderProjectPathList : folderProjectPathList
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
}
/**
 * @description 验证 outputGlobalPath 输出文件夹的全局路径是否存在，存在则删除 outputGlobalPath 并重新创建它
 * @param {string} outputGlobalPath
 */
function verificationOutputGlobalPath(outputGlobalPath) {
    var deteleOutputGlobalPath = function (outputGlobalPath) {
            try {
                iterator(outputGlobalPath);
                console.log('start detele [' + outputGlobalPath + '] folder done');
                return true;
            } catch (error) {
                if (error.code === "ENOENT") throw error;
                return false;
            }
            function iterator(globalPathParam) {
                var pathReadingCache = fs.statSync(globalPathParam);
                if (pathReadingCache.isDirectory()) {
                    _.each(fs.readdirSync(globalPathParam), function (folderParam) {
                        iterator(path.join(globalPathParam, folderParam));
                    });
                    fs.rmdirSync(globalPathParam);
                } else if (pathReadingCache.isFile()) {
                    fs.unlinkSync(globalPathParam); //直接删除文件
                }
            }
        },
        creatOutputGlobalPath = function (outputPathCompletion) {
            mkdirp.sync(outputPathCompletion);
            console.log('start creat [' + outputPathCompletion + '] folder done');
        };
    // 判断路径是否存在
    if (!fs.existsSync(outputGlobalPath)) {
        creatOutputGlobalPath(outputGlobalPath);
    } else {
        deteleOutputGlobalPath(outputGlobalPath);
        creatOutputGlobalPath(outputGlobalPath);
    }
}

