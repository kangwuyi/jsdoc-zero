/*global document */
(function () {
    var source = document.getElementsByClassName('prettyprint source linenums');
    var i = 0;
    var lineNumber = 0;
    var lineId;
    var lines;
    var totalLines;
    var anchorHash;

    if (source && source[0]) {
        anchorHash = document.location.hash.substring(1);
        lines = source[0].getElementsByTagName('li');
        totalLines = lines.length;

        for (; i < totalLines; i++) {
            lineNumber++;
            lineId = 'line' + lineNumber;
            lines[i].id = lineId;
            if (lineId === anchorHash) {
                lines[i].className += ' selected';
            }
        }
    }
})();
!function ($) {
    var staticLoadRelativePath = $('#staticLoadRelativePath').val();
    var jsdocListHtml = '';
    for (var i = 0; i < jsdocList.length; i++) {
        jsdocListHtml = jsdocListHtml + '<a href="' +
            staticLoadRelativePath + '/' + jsdocList[i].sourceProjectPath.replace(/\\/g, "/") + '/' + jsdocList[i].fileNameObject.generateFile + '#' + jsdocList[i].line + '_' + jsdocList[i].codeStart +
            '" class="package list-group-item row" data-library-name="' +
            jsdocList[i].name +
            '" target="_blank" style="display: none;">' +
            '<div class="col-md-6">name: ' + jsdocList[i].name +'</div>'+
            '<div class="col-md-6">url: ' + jsdocList[i].sourceProjectPath.replace(/\\/g, "/") + '/' + jsdocList[i].fileNameObject.fileHasExtname +'</div>'+
            '</a>'
    }
    $('#all-packages .list-group').append(jsdocListHtml);

    $(".search").focus().on("keyup", function (event) {
        var c = $(event.currentTarget).val();
        c.length > 0 ? ($("#all-packages [data-library-name]").hide(), $('#all-packages [data-library-name*="' + c.toLowerCase() + '"]').show()) : $("[data-library-name]").hide()
    });

    $(document).on("input", ".clearable", function () {
        this.value ? $(this).next("i").removeClass("glyphicon-search").addClass("glyphicon-remove x") : $(this).next("i").removeClass("glyphicon-remove").addClass("glyphicon-search")
    }).on("mousemove", ".x", function () {
        $(this).addClass("onX")
    }).on("click", ".onX", function () {
        $(this).removeClass("x onX").prev("input").val("").change(), $(this).removeClass("glyphicon-remove").addClass("glyphicon-search"), $("[data-library-name]").hide()
    }), $(window).scroll(function () {
        $(this).scrollTop() > 100 ? $("#back-to-top").fadeIn() : $("#back-to-top").fadeOut()
    }), $("#back-to-top").on("click", function (b) {
        return b.preventDefault(), $("html, body").animate({scrollTop: 0}, 100), !1
    });

}(jQuery);