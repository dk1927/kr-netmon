var Telegram = {
    token: null,
    to: null,
    message: null,
    proxy: null,
    parse_mode: 'Markdown',

    sendMessage: function() {
        var params = {
            chat_id: Telegram.to,
            text: Telegram.message,
            parse_mode: Telegram.parse_mode,
            disable_web_page_preview: true
        };

        var url = 'https://api.telegram.org/bot' + Telegram.token + '/sendMessage';
        var request = new HttpRequest();

        if (Telegram.proxy) {
            request.setProxy(Telegram.proxy);
        }

        request.addHeader('Content-Type: application/json');
        var response = request.post(url, JSON.stringify(params));

        Zabbix.log(4, '[Telegram Webhook] Response: ' + response);

        if (request.getStatus() !== 200) {
            throw 'Error ' + request.getStatus() + ': ' + response;
        }
        return response;
    }
};

try {
    var params = JSON.parse(value);

    if (!params.Token) {
        throw 'Missing "Token" parameter';
    }
    Telegram.token = params.Token;

    if (!params.To) {
        throw 'Missing "To" parameter';
    }
    Telegram.to = params.To;

    if (!params.Subject || !params.Message) {
        throw 'Missing "Subject" or "Message" parameter';
    }

    Telegram.proxy = params.Proxy;
    Telegram.parse_mode = params.ParseMode || 'Markdown';

    // Formatting the message with Emoji based on severity
    var severity = params.Severity || 'Unknown';
    var icon = 'ℹ️'; // Default
    if (severity === 'Disaster') icon = '🔥';
    else if (severity === 'High') icon = '🔴';
    else if (severity === 'Average') icon = '🟠';
    else if (severity === 'Warning') icon = '⚠️';
    else if (severity === 'Information') icon = '🔵';

    Telegram.message = icon + ' *' + params.Subject + '*\n\n' + params.Message;

    Telegram.sendMessage();

    return 'OK';
} catch (error) {
    Zabbix.log(3, '[Telegram Webhook] Failed: ' + error);
    throw 'Failed with error: ' + error;
}
