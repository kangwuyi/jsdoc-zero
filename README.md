# JSDOC-ZERO

![travis-ci](https://travis-ci.org/kahn1990/jsdoc-zero.svg?branch=master)
![NPM Version](https://img.shields.io/npm/v/jsdoc-zero.svg?style=flat)
![NPM Downloads](https://img.shields.io/npm/dm/jsdoc-zero.svg?style=flat)

===========================================================================
## 简介 (Introductions)

`JSDOC-ZERO` 与其他文档生成工具的不同之处在于它是以文件目录为单位，一层一层递归的，适用于工程较大、文件内容较多、文件夹层次较深的项目。

[==> npm](https://npmjs.org/package/jsdoc-zero)
[--> 查看示例](http://kahn1990.com/jsdoc-zero/doc/dox/index.html)

## 安装 (Installation)
安装 JSDOC-ZERO 为全局工具：

```
$ npm install jsdoc-zero -g
```

## 使用 (Use)

### 建立配置文件 (Create configuration file)

首先在项目根目录下建立 `dox.config.json` 文件，默认内容为：

```
{
  "name"     : "default",
  "version"  : "0.0.1",
  "source"   : {
    "include": [
      "lib"
    ],
    "exclude": [
      "node_modules"
    ],
    "suffix" : [
      ".js"
    ],
    "output" : "doc/dox"
  }
}
```

其中含义：

- name : 项目名称
- version : 版本号码
- source
    - include : 待检查目录的集合
    - exclude : 需要过滤的目录集合
    - suffix : 待检查文件的后缀名
    - output : 输出目录

新建文件 `dox.config.json` 完成之后，根据自己的具体项目完善配置文件，然后在当前项目的根目录下的命令行中执行命令：

```js
$ jdz build
```
此时 `jdz` 会自动寻找项目根目录下的 `dox.config.json` 文件进行相关操作。

### 注意 (Careful)

when `JSDOC-ZERO` generating documentation, it will empty all files under `the output directory`.

### 效果图 (Sample picture)

First `JSDOC-ZERO` in the output directory to establish an index file: ` index.html`, it contains `Waiting for the check folder` and its subdirectories directory of all ` md ` files.

![](./img/gif/menuogv.gif)

Generated ` JSDOC ` specification file, it include the basic file information at the head and set the anchor point of the page method, is used for quick jump.

![](./img/gif/jsogv.gif)

New add search function and it will search for file‘s comments content by the input method name：

![](./img/gif/searchogv.gif)


The `md` file rendering display：

![](./img/gif/mdogv.gif)

## Update

### `2016/7/15`

1. 修改部分代码写法，增强可阅读性
1. 修改所有页面的 css 样式
1. 增加相对静态路径，将 js 等静态资源从 cdn 转为本地静态资源
1. 增加文件相关信息
1. 增加搜索功能，可以根据相关注释方法名搜索到相应文件
1. 增加返回根目录功能以及生成文件名用 base64 处理


## Coverage summary

| Statements: | 79.1% ( 159/201 ) |
|---|
| Branches: | 51.22% ( 42/82 ) |
| Functions: | 88.24% ( 45/51 ) |
| Lines: | 80.3% ( 159/198 ) |

