# planer
Remove reply quotations from emails.

At [lever](https://github.com/lever) we are into simple machines. 
A planer removes some material to flatten out a rough surface, which seemed appropriate for a module that smooths out an email to extract the actual message.

This is essentially a javascript port of Mailgun's awesome [`talon`](https://github.com/mailgun/talon) python library.
Planer does not do signatures, though there is a [node port](https://github.com/lmtm/node-talon) of that part of talon.

# Installation
Use npm to install planer( add `-g` if you would like it to be global):

`npm install planer`

# Usage

_Important_: planer accepts an injected [Document](https://developer.mozilla.org/en-US/docs/Web/API/Document) object to perform html parsing.
You can use `window.document` in a browser, or something akin to `jsdom` on the server. 
We use `jsdom` in our test suite.

To extract the message from a plain text email:
```
planer = require('planer');

msgBody = "Reply!\n\nOn 15-Dec-2011, at 6:54 PM, Sean Carter <s.carter@example.com> wrote:\n> It's the ROC!\n>-Sean";
actualMessage = planer.extractFrom(msgBody, 'text/plain');
console.log(actualMessage); # "Reply!"
```

To extract the message from an html email:
```
planer = require('planer');

msgBody = 'Reply!\n<div>\nOn 11-Apr-2011, at 6:54 PM, Bob &lt;bob@example.com&gt; wrote:\n</div>\n<blockquote>\n<div>\nTest\n</div>\n</blockquote>';
actualMessage = planer.extractFrom(msgBody, 'text/html', window.document);
console.log(actualMessage) # "<html><body>Reply!\n</body></html>";
```


