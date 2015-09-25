const BACKSPACE = 8;
const PAUSE_BREAK = 19;
const SPACE = 32;
const ENTER = 13;
const BR = '\<br\>'; // for regex

var typedText = [[]];
var typedTextInRu = [[]];
var typedTextInEn = [[]];

var correctImmediately = false;
var immediateSource = null;

String.prototype.decodeHTML = function () {
    var map = {"gt": ">", "lt": "<" /* , … */};
    return this.replace(/&(#(?:x[0-9a-f]+|\d+)|[a-z]+);?/gi, function ($0, $1) {
        if ($1[0] === "#") {
            return String.fromCharCode($1[1].toLowerCase() === "x" ? parseInt($1.substr(2), 16) : parseInt($1.substr(1), 10));
        } else {
            return map.hasOwnProperty($1) ? map[$1] : $0;
        }
    });
};

$(function () {
    $(document).on('click', function () {
        correctImmediately = false;
        immediateSource = null;
        _resetAll();
    });

    $(document).on('keydown', function (e) {
        _performAction(e);
    });

    $(document).on('keypress', function (e) {
        _evaluateKey(e);
    });
});

function _placeCaretAt(target, place) {
    if ($(target).is('div')) {
        // todo: fix place caret for div
        if (typeof window.getSelection != "undefined"
            && typeof document.createRange != "undefined") {
            var range = document.createRange();
            range.selectNodeContents(target);
            range.collapse(false);
            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        } else if (typeof document.body.createTextRange != "undefined") {
            var textRange = document.body.createTextRange();
            textRange.moveToElementText(target);
            textRange.collapse(false);
            textRange.select();
        }
    } else {
        target.selectionEnd = target.selectionStart = place;
    }
}

function _fixTyped(target) {
    if (_top(typedText).length) {
        var fixed = _fixAllParts(_getTargetText(target));
        _setTargetText(target, fixed);
    }
}

function _fixLastWord(target) {
    var lastWord = _getLastWord(typedText);
    var lastWordInRu = _getLastWord(typedTextInRu);
    var lastWordInEn = _getLastWord(typedTextInEn);
    if (lastWord.length) {
        var fixed = _replaceLastWord(_getTargetText(target), lastWord, _getCorrectFix(lastWordInRu, lastWordInEn));
        _setTargetText(target, fixed);
    }
}

function _getTargetText(target) {
    var $target = $(target);
    return $target.val() || $target.html();
}

function _setTargetText(target, text) {
    var $target = $(target);
    $target.val() ? $target.val(text) : $target.html(text);
}

function _getCorrectFix(ru_src, en_src, i) {
    ru_src = i === undefined ? ru_src : ru_src[i];
    en_src = i === undefined ? en_src : en_src[i];

    if (ru_src.indexOf(undefined) < 0) {
        !immediateSource && (immediateSource = en_ru_table);
        return ru_src;
    } else {
        !immediateSource && (immediateSource = ru_en_table);
        return en_src;
    }
}

function _fixAllParts(wrongText) {
    var fixed = wrongText;
    typedText.forEach(function (textPart, i) {
        fixed = _replace(fixed, textPart, _getCorrectFix(typedTextInRu, typedTextInEn, i));
    });
    return fixed;
}

function _replace(target, part, fix) {
    target = target.decodeHTML();
    return target.replace(
        String.fromCharCode.apply(null, part),
        String.fromCharCode.apply(null, fix)
    );
}

function _replaceLastWord(target, part, fix) {
    target = target.decodeHTML();
    var w = String.fromCharCode.apply(null, part).replace(/[<>*()?]/g, "\\$&");
    return target.replace(
        new RegExp(w + '(?!.*' + w + ')'),
        String.fromCharCode.apply(null, fix)
    );
}

function _correctImmediately(e) {
    e.preventDefault();

    var targetText = _getTargetText(e.target);
    var selectionStart = e.target.selectionStart;
    var selectionEnd = e.target.selectionEnd;

    // vk dialogs workaround because of <br> in empty line
    var replacement = String.fromCharCode(immediateSource[e.charCode]);
    if (window.location.toString().indexOf('vk.com/im') > -1 &&
        targetText.lastIndexOf(BR) > -1 && targetText.lastIndexOf(BR) === targetText.length - BR.length) {

        _setTargetText(e.target, targetText.replace(
                new RegExp(BR + '(?!.*' + BR + ')'), replacement
            )
        );
    } else {
        _setTargetText(e.target, targetText.slice(0, selectionStart)+ replacement+ targetText.slice(selectionEnd));
    }

    _placeCaretAt(e.target, selectionStart+1);
}

function _evaluateKey(e) {
    if (e.charCode === ENTER || e.charCode === SPACE) return;

    if (correctImmediately) {
        _correctImmediately(e);
    } else {
        var inRu = en_ru_table[e.charCode];
        var inEn = ru_en_table[e.charCode];

        _top(typedText).push(e.charCode);
        _top(typedTextInRu).push(inRu);
        _top(typedTextInEn).push(inEn);
    }
}

function _pop(typed) {
    _top(typed).pop();
    !_top(typed).length && _popPart(typed);
}

function _popPart(typed) {
    typed.pop();
    !typed.length && typed.push([]);
}

function _performAction(e) {
    switch (e.keyCode) {
        case PAUSE_BREAK:
            if (!correctImmediately) {
                if (e.shiftKey) {
                    _fixTyped(e.target);
                    _resetAll();
                } else {
                    _fixLastWord(e.target);
                    _popLastWords();
                }
                _placeCaretAt(e.target, $(e.target).val().length);
                correctImmediately = !!immediateSource;
            } else {
                correctImmediately = false;
                immediateSource = null;
            }

            break;
        case BACKSPACE:
            _pop(typedText);
            _pop(typedTextInEn);
            _pop(typedTextInRu);
            break;
        case SPACE:
        case ENTER:
            typedText.push([]);
            typedTextInEn.push([]);
            typedTextInRu.push([]);
            break;
    }
}

function _resetAll() {
    typedText = [[]];
    typedTextInRu = [[]];
    typedTextInEn = [[]];
}

function _getLastWord(src) {
    var topPart = _top(src);
    while (src.length > 1 && !topPart.length) {
        _popLastWords();
        topPart = _top(src);
    }
    return topPart;
}

function _popLastWords() {
    _popPart(typedText);
    _popPart(typedTextInEn);
    _popPart(typedTextInRu);
}

function _top(arr) {
    return arr[arr.length - 1];
}

