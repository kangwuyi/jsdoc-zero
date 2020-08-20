'use strict';

var fs            = require('fs'),
    path          = require('path'),
    swig          = require('swig'),
    _             = require('underscore'),
    mkdirp        = require('mkdirp'),
    underscoreStr = require('underscore.string'),
    markdown      = require('marked').parse,
    crypto        = require('crypto'),
    dox           = require('dox'),
    merge         = require('./merge'),
    utils         = require('./utils'),
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

var options = {};

/**
 * 递归遍历路径下的文件
 * @param sourcePath
 * @param callback
 * @returns {*}
 */
function walk(sourcePath, callback) {
    var generateGlobalPath           = sourcePath.generateGlobalPath,
        generateProjectPath          = sourcePath.generateProjectPath,
        sourceGlobalPath             = sourcePath.sourceGlobalPath,
        sourceProjectPath            = sourcePath.sourceProjectPath,
        excludePathList              = options.excludePathList,
        excludeFolderProjectPathList = excludePathList[0] ? excludePathList[0].folderProjectPathList : [];

    if (!utils.verificationPath(generateGlobalPath).status) {

        if (_.indexOf(excludeFolderProjectPathList, sourceProjectPath) === -1) {
            mkdirp.sync(generateGlobalPath);
            console.log('creat [' + generateGlobalPath + '] folder');
            // 收集空目录下的 index.html 索引文件内容

            dirsFileArrContainer.push({
                writeFileSyncPath: path.join(generateGlobalPath, 'index.html'),
                render           : {
                    locals  : {
                        fileName              : 'index.html',
                        sourceProjectPath     : sourceProjectPath,
                        generateProjectPath   : generateProjectPath,
                        staticLoadRelativePath: path.relative(generateGlobalPath, options.outputGlobalPath),
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
                    filename: path.join(generateProjectPath, 'index.html')
                }
            });
        }
    }

    var filesCache = callback(sourcePath);  // 先把路径下文件取出
    // 处理目录下文件夹列表
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
 * @param callback
 * @returns {Array}
 */

function getFileList(sourcePathParam, callback) {
    var sourceGlobalPath  = sourcePathParam.sourceGlobalPath,
        sourceProjectPath = sourcePathParam.sourceProjectPath,
        excludePathList   = options.excludePathList,
        suffixList        = options.source.suffix,
        getFileListInDir  = [];
    suffixList            = suffixList.concat(['.md', '.markdown', '.MARKDOWN', '.MD']);
    excludePathList       = excludePathList[0] ? excludePathList[0].folderProjectPathList : [];

    if (_.indexOf(excludePathList, sourceProjectPath) === -1) {

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
 * @param callback {function}
 * @api private
 * @returns {{}}
 */
var getFileJsonAPIs = function (callback) {

    return _.map(options.sourcePathList, function (item) {
        if (!utils.verificationPath(item.sourceGlobalPath).status) {
            return false;
        }
        return walk(item, function (param) {
            return callback(param);
        });
    });
};

/**
 * 主程序入口
 * @param optionsContainer {object}
 */
module.exports = function (optionsContainer) {

    options              = optionsContainer;
    var outputGlobalPath = path.resolve(options.source.output),
        output           = options.source.output;   // 输出文件夹

    options['outputGlobalPath'] = outputGlobalPath;

    options['sourcePathList']  = _.map(options.source.include, function () {
        return utils.handlePathList.apply(this, Array.prototype.slice.call(arguments).concat(output));
    });  // 源文件夹队列;
    options['excludePathList'] = _.map(options.source.exclude, function () {
        return utils.handlePathList.apply(this, Array.prototype.slice.call(arguments).concat(output));
    }); // 过滤文件夹队列;

    utils.verificationPath(outputGlobalPath).status
        ? utils.deteleOutputGlobalPath(outputGlobalPath)
        : utils.creatOutputGlobalPath(outputGlobalPath);

    var generateAllJsFileInfoForJson = getFileJsonAPIs(function (sourcePathParam) {
        var generateGlobalPath  = sourcePathParam.generateGlobalPath,
            generateProjectPath = sourcePathParam.generateProjectPath,
            sourceGlobalPath    = sourcePathParam.sourceGlobalPath,
            sourceProjectPath   = sourcePathParam.sourceProjectPath;

        return {
            pathName: sourceGlobalPath,
            fileList: getFileList(
                sourcePathParam,
                function (fileNameObject, getFileListInDir) {
                    var fileHasExtname          = fileNameObject.fileHasExtname,
                        fileExtname             = fileNameObject.fileExtname,
                        sourceGlobalPathFile    = path.join(sourceGlobalPath, fileHasExtname),
                        sourceFileContentCache  = fs.readFileSync(sourceGlobalPathFile, 'utf8'),
                        sourceFileNameBuffer    = new Buffer(path.join(sourceProjectPath, fileHasExtname)).toString('base64'),
                        generateFile            = sourceFileNameBuffer + '.html';
                    fileNameObject.generateFile = generateFile;
                    var fileObjectCache         = {
                        generatePathFile      : path.join(generateGlobalPath, generateFile),
                        generateProjectPath   : generateProjectPath,
                        generateGlobalPath    : generateGlobalPath,
                        fileNameObject        : fileNameObject,
                        sourceProjectPath     : sourceProjectPath,
                        staticLoadRelativePath: path.relative(generateGlobalPath, options.outputGlobalPath)
                    };

                    if (_.indexOf(['.md', '.markdown', '.MARKDOWN', '.MD'], fileExtname) !== -1) {
                        fileObjectCache.content = markdown(sourceFileContentCache);
                        fileObjectCache.indexs  = getIndexs(sourceFileContentCache, 0, function (item, i) {
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
            generateGlobalPath    : options.outputGlobalPath,
            folderProjectPathIndex: 0,
            folderProjectPathList : []
        },
        function (fileNameObject) {
            var fileHasExtname          = fileNameObject.fileHasExtname,
                fileExtname             = fileNameObject.fileExtname,
                sourceGlobalPathFile    = path.join(options.projectHomePath, fileHasExtname),
                sourceFileContentCache  = fs.readFileSync(sourceGlobalPathFile, 'utf8'),
                sourceFileNameBuffer    = new Buffer(path.join(fileHasExtname)).toString('base64'),
                generateFile            = sourceFileNameBuffer + '.html';
            fileNameObject.generateFile = generateFile;
            if (_.indexOf(['.md', '.markdown', '.MARKDOWN', '.MD'], fileExtname) !== -1) {
                dirsMarkdownArrContainer.push({
                    generatePathFile      : path.join(options.outputGlobalPath, generateFile),
                    generateProjectPath   : options.source.output,
                    generateGlobalPath    : options.outputGlobalPath,
                    fileNameObject        : fileNameObject,
                    sourceProjectPath     : '.',
                    staticLoadRelativePath: '.',
                    content               : markdown(sourceFileContentCache),
                    indexs                : getIndexs(sourceFileContentCache, 0, function (item, i) {
                        return item.level > (i - 1);
                    })
                });
            }
        });
    creatFileFuncByMarkdown(dirsMarkdownArrContainer);
    creatHtmlIndexFile();
    creatincludePathFileFuncByHtml();
    creatFileFuncByHtml(dirsArrContainer);
    writeJsdocListFile(generateAllJsFileInfoForJson);
    child_process.execFileSync('cp', ['-R', path.join(__dirname, '../templates/jsdoc_static'), path.join(options.outputGlobalPath, 'jsdoc_static')]);
    return true;
};

function writeJsdocListFile(generateAllJsFileInfoForJson) {
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
        path.join(options.outputGlobalPath, 'jsdocList.js'),
        'var jsdocList = ' + JSON.stringify(generateAllJsFileInfoForJsonCache),
        'utf8'
    );
}
/**
 * 生成 markdown 文件
 * @param dirsMarkdownArrContainer
 */
function creatFileFuncByMarkdown(dirsMarkdownArrContainer) {
    _.each(dirsMarkdownArrContainer, function (item) {
        item.fileNameObject.relativeProjectPathFile = path.relative(options.outputGlobalPath, item.generatePathFile);
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
                    filename: _.str.strRight(item.generatePathFile, options.outputGlobalPath)
                }
            ),
            'utf8'
        );
        console.log('start write markdown file [' + item.generatePathFile + '] done');
    });
}
// 生成文档
function creatFileFuncByHtml(dirsArrContainer) {
    // 处理文件索引
    _.each(_.uniq(_.pluck(dirsArrContainer, 'generateProjectPath')), function (value) {
        var generateFileGlobalPath  = path.join(options.projectHomePath, value, 'index.html'),
            generateFileProjectPath = path.join(value, 'index.html'),
            generateProjectPath     = path.join(options.projectHomePath, value);

        dirsFileArrContainer.push({
            writeFileSyncPath: generateFileGlobalPath,
            render           : {
                locals  : {
                    fileName              : 'index.html',
                    sourceProjectPath     : path.relative(path.resolve(path.relative(options.projectHomePath, options.outputGlobalPath)), path.resolve(value)),
                    generateProjectPath   : path.relative(options.projectHomePath, path.resolve(value)),
                    staticLoadRelativePath: path.relative(path.dirname(generateFileGlobalPath), options.outputGlobalPath),
                    content               : {
                        linkList: _.without(_.map(dirsArrContainer, function (item) {
                            if (value === item.generateProjectPath) {
                                return item.fileNameObject;
                            } else {
                            }
                            return false;
                        }), false),    //==> [ '/testjs4.html' ]
                        dirList : _.without(
                            _.map(fs.readdirSync(generateProjectPath), function (dirIndexItem) {
                                if (fs.statSync(path.join(generateProjectPath, dirIndexItem)).isDirectory()) return dirIndexItem
                            }),
                            undefined
                        )  //==> [ 'cc' ]
                    }
                },
                filename: _.str.strRight(generateFileProjectPath, options.outputGlobalPath)
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
                        staticLoadRelativePath: path.relative(path.dirname(item.generatePathFile), options.outputGlobalPath),
                        content               : item.content
                    },
                    filename: _.str.strRight(item.generatePathFile, options.outputGlobalPath)
                }
            ),
            'utf8');
        console.log('start write ' + item.fileNameObject.fileExtname + ' file [' + item.generatePathFile + '] done');
    });
}

/**
 * 生成目录中可能存在的文件夹索引
 */
function creatincludePathFileFuncByHtml() {
    _.each(
        _.without(
            _.map(options.sourcePathList, function (item) {
                var itemSourceProjectPath = utils.rlPath(item.sourceProjectPath).replace(/[\/|\\\\]/g,'/');
                if (itemSourceProjectPath && _.str.include(itemSourceProjectPath, '/')) return itemSourceProjectPath;
            }),
            undefined
        ),
        function (item) {

            _.reduce(
                item.split("/"),
                function (memo, num) {
                    var pathChildrenCache = path.join(options.outputGlobalPath, _.isNumber(memo) ? '' : memo, num),
                        generatePathFile  = path.join(pathChildrenCache, 'index.html');

                    fs.writeFileSync(
                        generatePathFile,
                        swig.render(
                            getTemplates.pageList,
                            {
                                locals  : {
                                    fileName              : 'index.html',
                                    sourceProjectPath     : path.relative(options.outputGlobalPath,pathChildrenCache),
                                    generateProjectPath   : path.relative(options.projectHomePath,pathChildrenCache),
                                    staticLoadRelativePath: path.relative(pathChildrenCache, options.outputGlobalPath),
                                    content               : {
                                        outPath: [],   //==>/doc/dox
                                        dirList: [] //==> [ 'cc' ]
                                    }
                                },
                                filename: path.join(_.str.strRight(pathChildrenCache, options.projectHomePath), 'index.html')
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
 */
function creatHtmlIndexFile() {
    var generatePathFile = path.join(options.outputGlobalPath, 'index.html');

    fs.writeFileSync(
        generatePathFile,
        swig.render(
            getTemplates.indexZero,
            {
                locals  : {
                    fileName              : options.name,
                    staticLoadRelativePath: '.',
                    content               : {
                        linkList: markdownFileListIndexContainer,
                        dirList : _.map(options.sourcePathList, function (item) {
                            return _.str.strRight(item.sourceProjectPath, options.projectHomePath);
                        })  //==> [ 'cc' ]
                    }
                },
                filename: path.join(_.str.strRight(options.outputGlobalPath, options.projectHomePath), 'index.html') // 这里的 ‘/’ 不做 win 处理
            }
        ),
        'utf8');
    console.log('start creat index home`s page [' + generatePathFile + '] done');
}

/**
 * 从Markdown中提取标题列表
 * @return {Array} 返回标题列表
 */
const getIndexs = function (section, level, callback) {
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

