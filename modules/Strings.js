var path = require('path'),
    command_list = require(path.join(__dirname, '..', 'commands.json')),
    config = require(path.join(__dirname, '..', 'auth.json'));

class StringModule {

    constructor() {
        this.normal = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ `1234567890-=~!@#$%^&*()_+[]\\{}|;\':",./<>?';
        this.wide_chars = 'ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ ｀１２３４５６７８９０－＝～！＠＃＄％＾＆＊（）＿＋［］＼｛｝｜；＇："，．／<>？';
        this.numbers = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
        this.fraktur_chars = '𝖆𝖇𝖈𝖉𝖊𝖋𝖌𝖍𝖎𝖏𝖐𝖑𝖒𝖓𝖔𝖕𝖖𝖗𝖘𝖙𝖚𝖛𝖜𝖝𝖞𝖟𝕬𝕭𝕮𝕯𝕰𝕱𝕲𝕳𝕴𝕵𝕶𝕷𝕸𝕹𝕺𝕻𝕼𝕽𝕾𝕿𝖀𝖁𝖂𝖃𝖄𝖅 `1234567890-=~!@#$%^&*()_+[]\\{}|;\':",./<>?';
        this.circle_chars = 'ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏ `①②③④⑤⑥⑦⑧⑨0⊖⊜~!@#$%^&⊛()_⊕[]⦸{}⦶;\':",⨀⊘⧀⧁?';
        this.neg_circle_chars = '🅐🅑🅒🅓🅔🅕🅖🅗🅘🅙🅚🅛🅜🅝🅞🅟🅠🅡🅢🅣🅤🅥🅦🅧🅨🅩🅐🅑🅒🅓🅔🅕🅖🅗🅘🅙🅚🅛🅜🅝🅞🅟🅠🅡🅢🅣🅤🅥🅦🅧🅨🅩 `123456789⓿-=~!@#$%^&*()_+[]\\{}|;\':",./<>?';
        this.square_chars = '🄰🄱🄲🄳🄴🄵🄶🄷🄸🄹🄺🄻🄼🄽🄾🄿🅀🅁🅂🅃🅄🅅🅆🅇🅈🅉🄰🄱🄲🄳🄴🄵🄶🄷🄸🄹🄺🄻🄼🄽🄾🄿🅀🅁🅂🅃🅄🅅🅆🅇🅈🅉 `1234567890⊟=~!@#$%^&⧆()_⊞[]⧅{}|;\':",⊡⧄<>?';
        this.neg_square_chars = '🅰🅱🅲🅳🅴🅵🅶🅷🅸🅹🅺🅻🅼🅽🅾🅿🆀🆁🆂🆃🆄🆅🆆🆇🆈🆉🅰🅱🅲🅳🅴🅵🅶🅷🅸🅹🅺🅻🅼🅽🅾🅿🆀🆁🆂🆃🆄🆅🆆🆇🆈🆉 `1234567890-=~!@#$%^&*()_+[]\\{}|;\':",./<>?';
        this.struck_chars = '𝕒𝕓𝕔𝕕𝕖𝕗𝕘𝕙𝕚𝕛𝕜𝕝𝕞𝕟𝕠𝕡𝕢𝕣𝕤𝕥𝕦𝕧𝕨𝕩𝕪𝕫𝔸𝔹ℂ𝔻𝔼𝔽𝔾ℍ𝕀𝕁𝕂𝕃𝕄ℕ𝕆ℙℚℝ𝕊𝕋𝕌𝕍𝕎𝕏𝕐ℤ `𝟙𝟚𝟛𝟜𝟝𝟞𝟟𝟠𝟡𝟘-=~!@#$%^&*()_+[]\\{}|;\':",./<>';
        this.cursive_chars = '𝓪𝓫𝓬𝓭𝓮𝓯𝓰𝓱𝓲𝓳𝓴𝓵𝓶𝓷𝓸𝓹𝓺𝓻𝓼𝓽𝓾𝓿𝔀𝔁𝔂𝔃𝓐𝓑𝓒𝓓𝓔𝓕𝓖𝓗𝓘𝓙𝓚𝓛𝓜𝓝𝓞𝓟𝓠𝓡𝓢𝓣𝓤𝓥𝓦𝓧𝓨𝓩 `1234567890-=~!@#$%^&*()_+[]\\{}|;\':",./<>?';
        this.braille_chars = '⠁⠃⠉⠙⠑⠋⠛⠓⠊⠚⠅⠇⠍⠝⠕⠏⠟⠗⠎⠞⠥⠧⠺⠭⠽⠵⠁⠃⠉⠙⠑⠋⠛⠓⠊⠚⠅⠇⠍⠝⠕⠏⠟⠗⠎⠞⠥⠧⠺⠭⠽⠵ `1234567890-=~!@#$%^&*()_+[]\\{}|;\':",./<>?';
        this.morse_chars = [' .- ', ' -... ', ' -.-. ', ' -.. ', ' . ', ' ..-. ', ' --. ', ' .... ', ' .. ', ' .--- ', ' -.- ', ' .-.. ', ' -- ', ' -. ', ' --- ', ' .--. ', ' --.- ', ' .-. ', ' ... ', ' - ', ' ..- ', ' ...- ', ' .-- ', ' -..- ', ' -.-- ', ' --.. ',
                        ' .- ', ' -... ', ' -.-. ', ' -.. ', ' . ', ' ..-. ', ' --. ', ' .... ', ' .. ', ' .--- ', ' -.- ', ' .-.. ', ' -- ', ' -. ', ' --- ', ' .--. ', ' --.- ', ' .-. ', ' ... ', ' - ', ' ..- ', ' ...- ', ' .-- ', ' -..- ', ' -.-- ', ' --.. ',
                        ' / ', '`', ' .---- ', ' ..--- ', ' ...-- ', ' ....- ', ' ..... ', ' -.... ', ' --... ', ' ---.. ', ' ----. ', ' ----- ', ' -....- ', ' -...- ', '~', '!', ' .--.-. ', '#', '$', '%', '^', '&', '*', ' -.--.- ', ' -.--.- ', '_', '+', '[', ']', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' .----. ', ' ---... ', ' .-..-. ', ' --..-- ', ' .-.-.- ', ' -..-. ', ' ', ' ', ' ', ' ', ' ..--.. '];
    }

    wide(message) {
        let new_message = '';

        for (let char of message)
        {
            if (this.normal.indexOf(char) !== -1)
                new_message += this.wide_chars[this.normal.indexOf(char)];
            else
                new_message += char;
        }

        return new_message;
    }

    fraktur(message) {
        let new_message = '';

        for (let char of message)
        {
            if (this.normal.indexOf(char) !== -1)
                new_message += this.fraktur_chars[this.normal.indexOf(char)];
            else
                new_message += char;
        }

        return new_message;
    }

    circle(message) {
        let new_message = '';

        for (let char of message)
        {
            if (this.normal.indexOf(char) !== -1)
                new_message += this.circle_chars[this.normal.indexOf(char)];
            else
                new_message += char;
        }

        return new_message;
    }

    neg_circle(message) {
        let new_message = '';

        for (let char of message)
        {
            if (this.normal.indexOf(char) !== -1)
                new_message += this.neg_circle_chars[this.normal.indexOf(char)];
            else
                new_message += char;
        }

        return new_message;
    }

    square(message) {
        let new_message = '';

        for (let char of message)
        {
            if (this.normal.indexOf(char) !== -1)
                new_message += this.square_chars[this.normal.indexOf(char)];
            else
                new_message += char;
        }

        return new_message;
    }

    neg_square(message) {
        let new_message = '';

        for (let char of message)
        {
            if (this.normal.indexOf(char) !== -1)
                new_message += this.neg_square_chars[this.normal.indexOf(char)];
            else
                new_message += char;
        }

        return new_message;
    }

    struck(message) {
        let new_message = '';

        for (let char of message)
        {
            if (this.normal.indexOf(char) !== -1)
                new_message += this.struck_chars[this.normal.indexOf(char)];
            else
                new_message += char;
        }

        return new_message;
    }

    cursive(message) {
        let new_message = '';

        for (let char of message)
        {
            if (this.normal.indexOf(char) !== -1)
                new_message += this.cursive_chars[this.normal.indexOf(char)];
            else
                new_message += char;
        }

        return new_message;
    }

    braille(message) {
        let new_message = '';

        for (let char of message)
        {
            if (this.normal.indexOf(char) !== -1)
                new_message += this.braille_chars[this.normal.indexOf(char)];
            else
                new_message += char;
        }

        return new_message;
    }

    morse(message) {
        let new_message = '';

        for (let char of message)
        {
            if (this.normal.indexOf(char) !== -1)
                new_message += this.morse_chars[this.normal.indexOf(char)];
            else
                new_message += char;
        }

        return new_message;
    }

    block(message) {
        let new_message = '';

        for (let char of message)
        {
            if (char.match(/[a-z]/i))
                new_message += `:regional_indicator_${char.toLowerCase()}: `;
            else if (char.match(/[0-9]/))
                new_message += `:${this.numbers[parseInt(char, 10)]}:`;
            else
                new_message += char;
        }

        return new_message;
    }

    space(message, args) {
        let new_message = '';
        let content = message;
        let num_spaces = 1;

        if (parseInt(args[0], 10))
        {
            content = args.splice(1).join(' ');
            num_spaces = parseInt(args[0], 10);
        }

        for (let char of content)
        {
            new_message += char;

            for (let i = 0; i < num_spaces; i++)
                new_message += ' ';
        }

        return new_message;
    }

    mocking(message) {
        let new_message = '';

        for (let i = 0; i < message.length; i++)
        {
            if (i % 2 == 0)
                new_message += message[i].toUpperCase();
            else
                new_message += message[i].toLowerCase();
        }

        return new_message;
    }

    async on_message(bot, message, command, args) {
        if (typeof this[command] === 'function')
        {
            let content = message.content.slice(config.prefix.length + command.length + 1);
            let new_message = this[command](content, args);

            if (new_message)
            {
                if (new_message.length <= 2000)
                {
                    message.channel.send(new_message);
                }
                else
                {
                    message.channel.send({
                        embed:
                        {
                            title: 'Error Sending Message',
                            description: 'Message exceeded 2,000 character limit.',
                            color: config.embed_color
                        }
                    });
                }
            }
        }
    }

}

module.exports = StringModule;
