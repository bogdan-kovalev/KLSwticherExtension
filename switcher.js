(function () {
    "use strict";

    const BACKSPACE = 8;
    const PAUSE_BREAK = 19;
    const SPACE = 32;
    const ENTER = 13;
    const BR = '\<br\>'; // for regex

    let typedText = [[]];
    let typedTextInRu = [[]];
    let typedTextInEn = [[]];

    let correctImmediately = false;
    let immediateSource = null;

    String.prototype.decodeHTML = function () {
        let map = {"gt": ">", "lt": "<", "nbsp": " "};
        return this.replace(/&(#(?:x[0-9a-f]+|\d+)|[a-z]+);?/gi, function ($0, $1) {
            if ($1[0] === "#") {
                return String.fromCharCode($1[1].toLowerCase() === "x" ? parseInt($1.substr(2), 16) : parseInt($1.substr(1), 10));
            } else {
                return map.hasOwnProperty($1) ? map[$1] : $0;
            }
        });
    };

    String.prototype.encodeWSpaces = function () {
        return this.replace(/ /g, "&nbsp;");
    };

    $(function () {
        /*$(document).on('click', function () {
            correctImmediately = false;
            immediateSource = null;
            _resetAll();
         });*/

        $(document).on('keydown', function (e) {
            _performAction(e);
        });

        $(document).on('keypress', function (e) {
            _evaluateKey(e);
        });
    });

    function _fixTyped(target) {
        if (_top(typedText).length) {
            let fixed = _fixAllParts(_getTargetText(target));
            _setTargetText(target, fixed);
        }
    }

    function _fixLastWord(target) {
        let lastWord = _getLastWord(typedText);
        let lastWordInRu = _getLastWord(typedTextInRu);
        let lastWordInEn = _getLastWord(typedTextInEn);
        if (lastWord.length) {
            let fixed = _replaceLastWord(_getTargetText(target), lastWord, _getCorrectFix(lastWordInRu, lastWordInEn));
            _setTargetText(target, fixed);
        }
    }

    function _getTargetText(target) {
        let $target = $(target);
        return $target.val() || $target.html();
    }

    function _setTargetText(target, text) {
        let $target = $(target);
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
        let fixed = wrongText;
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
        let w = String.fromCharCode.apply(null, part).replace(/[<>*()?]/g, "\\$&");
        return target.replace(
            new RegExp(w + '(?!.*' + w + ')'),
            String.fromCharCode.apply(null, fix)
        );
    }

    function _correctImmediately(e) {
        e.preventDefault();

        let targetText = _getTargetText(e.target).decodeHTML();
        let selectionStart = $(e.target).caret();
        let selectionEnd = e.target.selectionEnd || selectionStart;

        // vk dialogs workaround because of <br> in empty line
        let replacement = String.fromCharCode(immediateSource[e.charCode]);
        if (window.location.toString().indexOf('vk.com/im') > -1 &&
            targetText.lastIndexOf(BR) > -1 && targetText.lastIndexOf(BR) === targetText.length - BR.length) {

            let text = targetText.replace(
                new RegExp(BR + '(?!.*' + BR + ')'), replacement
            );
            _setTargetText(e.target, text.encodeWSpaces()
            );
        } else {
            let text = targetText.slice(0, selectionStart) + replacement + targetText.slice(selectionEnd);
            _setTargetText(e.target, text.encodeWSpaces());
        }

        $(e.target).caret(selectionStart + 1);
    }

    function _evaluateKey(e) {
        if (e.charCode === ENTER || e.charCode === SPACE) return;

        if (correctImmediately) {
            _correctImmediately(e);
        } else {
            let inRu = en_ru_table[e.charCode];
            let inEn = ru_en_table[e.charCode];

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
                    $(e.target).caret(-1);
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
        let topPart = _top(src);
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
}());