/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// @ts-expect-error TS(2451): Cannot redeclare block-scoped variable 'expect'.
const { expect } = require('chai');
// @ts-expect-error TS(2451): Cannot redeclare block-scoped variable 'planer'.
const planer = require('../../src/planer');

describe('planer#extractFromPlain', () => {
  it('should return a the test of a simple message', () => {
    const msgBody = 'Oh, hai';
    return expect(planer.extractFromPlain(msgBody)).to.equal('Oh, hai');
  });

  it('understands the on-date-somebody-wrote splitter', () => {
    const msgBody = `Test reply

On 11-Apr-2011, at 6:54 PM, Roman Tkachenko <romant@example.com> wrote:

>
> Test
>
> Roman`;
    return expect(planer.extractFromPlain(msgBody)).to.equal('Test reply');
  });

  it('allows humans to use on to start a line', () => {
    const msgBody = `Blah-blah-blah
On blah-blah-blah`;
    return expect(planer.extractFromPlain(msgBody)).to.equal(msgBody);
  });

  it('Notices when real test is on the splitter line', () => {
    let msgBody = `reply On Wed, Apr 4, 2012 at 3:59 PM, bob@example.com wrote:
> Hi`;
    expect(planer.extractFromPlain(msgBody)).to.equal('reply');

    msgBody = `reply--- On Wed, Apr 4, 2012 at 3:59 PM, me@domain.com wrote:
> Hi`;
    expect(planer.extractFromPlain(msgBody)).to.equal('reply');

    msgBody = `reply
bla-bla - bla--- On Wed, Apr 4, 2012 at 3:59 PM, me@domain.com wrote:
> Hi`;
    const reply = `reply
bla-bla - bla`;
    return expect(planer.extractFromPlain(msgBody)).to.equal(reply);
  });

  it('picks up replies after the quotation', () => {
    const msgBody = `On 04/19/2011 07:10 AM, Roman Tkachenko wrote:

>
> Test
Test reply`;

    return expect(planer.extractFromPlain(msgBody)).to.equal('Test reply');
  });

  it('detects wrapping replies', () => {
    const msgBody = `Test reply
On 04/19/2011 07:10 AM, Roman Tkachenko wrote:

>
> Test
Regards, Roman`;
    const reply = `Test reply

Regards, Roman`;

    return expect(planer.extractFromPlain(msgBody)).to.equal(reply);
  });

  it('detects wrapping of nested replies', () => {
    const msgBody = `Test reply
On 04/19/2011 07:10 AM, Roman Tkachenko wrote:

>Test test
>On 04/19/2011 07:10 AM, Roman Tkachenko wrote:
>
>>
>> Test.
>>
>> Roman

Regards, Roman`;
    const reply = `Test reply

Regards, Roman`;

    return expect(planer.extractFromPlain(msgBody)).to.equal(reply);
  });

  it('is not fooled by 2 line splitters', () => {
    const msgBody = `Test reply
On Fri, May 6, 2011 at 6:03 PM, Roman Tkachenko from Hacker News
<roman@definebox.com> wrote:

> Test.
>
> Roman

Regards, Roman`;

    const reply = `Test reply

Regards, Roman`;

    return expect(planer.extractFromPlain(msgBody)).to.equal(reply);
  });

  it('not fooled by 3 line splitters', () => {
    const msgBody = `Test reply
On Nov 30, 2011, at 12:47 PM, Somebody <
416ffd3258d4d2fa4c85cfa4c44e1721d66e3e8f4@somebody.domain.com>
wrote:

Test message\
`;

    return expect(planer.extractFromPlain(msgBody)).to.equal('Test reply');
  });

  it('works with brief quotes', () => {
    const msgBody = `Hi
On 04/19/2011 07:10 AM, Roman Tkachenko wrote:

> Hello`;

    return expect(planer.extractFromPlain(msgBody)).to.equal('Hi');
  });

  it('works with brief quotes', () => {
    const msgBody = `Hi
On 04/19/2011 07:10 AM, Roman Tkachenko wrote:

> Hello`;

    return expect(planer.extractFromPlain(msgBody)).to.equal('Hi');
  });

  it('is not fooled bt indents', () => {
    const msgBody = `YOLO salvia cillum kogi typewriter mumblecore cardigan skateboard Austin.

------On 12/29/1987 17:32 PM, Julius Caesar wrote-----

Brunch mumblecore pug Marfa tofu, irure taxidermy hoodie readymade pariatur.\
`;
    return expect(planer.extractFromPlain(msgBody)).to.equal(
      'YOLO salvia cillum kogi typewriter mumblecore cardigan skateboard Austin.'
    );
  });

  it('is not fooled by empty lines in quoted messages', () => {
    const msgBody = `Btw blah blah...

On Tue, Jan 27, 2015 at 12:42 PM -0800, "Company" <christine.XXX@XXX.com> wrote:

Hi Mark,
Blah blah? 
Thanks,Christine 

On Jan 27, 2015, at 11:55 AM, Mark XXX <mark@XXX.com> wrote:

Lorem ipsum?
Mark

Sent from Acompli`;

    return expect(planer.extractFromPlain(msgBody)).to.equal('Btw blah blah...');
  });

  it('does not barf on unicode characters in a name', () => {
    const msgBody = `Replying ok
2011/4/7 Nathan \xd0\xb8ova <support@example.com>

>  Cool beans, scro`;

    return expect(planer.extractFromPlain(msgBody)).to.equal('Replying ok');
  });

  it('understands the original message headers are not part of the reply', () => {
    const msgBody = `Allo! Follow up MIME!

From: somebody@example.com
Sent: March-19-11 5:42 PM
To: Somebody
Subject: The manager has commented on your Loop

Blah-blah-blah\
`;
    return expect(planer.extractFromPlain(msgBody)).to.equal('Allo! Follow up MIME!');
  });

  it('understands the original message headers in German are not part of the reply', () => {
    const msgBody = `Allo! Follow up MIME!

Von: somebody@example.com
Gesendet: Dienstag, 25. November 2014 14:59
An: Somebody
Betreff: The manager has commented on your Loop

Blah-blah-blah\
`;
    return expect(planer.extractFromPlain(msgBody)).to.equal('Allo! Follow up MIME!');
  });

  it('understands the original message headers in French are not part of the reply', () => {
    const msgBody = `Allo! Follow up MIME!

De : Brendan xxx [mailto:brendan.xxx@xxx.com]
Envoyé : vendredi 23 janvier 2015 16:39
À : Camille XXX
Objet : Follow Up

Blah-blah-blah\
`;
    return expect(planer.extractFromPlain(msgBody)).to.equal('Allo! Follow up MIME!');
  });

  it('understands the original message headers in Danish are not part of the reply', () => {
    const msgBody = `Allo! Follow up MIME!

Fra: somebody@example.com
Sendt: 19. march 2011 12:10
Til: Somebody
Emne: The manager has commented on your Loop

Blah-blah-blah\
`;
    return expect(planer.extractFromPlain(msgBody)).to.equal('Allo! Follow up MIME!');
  });

  it('understands the original message headers in Swedish are not part of the reply', () => {
    const msgBody = `Allo! Follow up MIME!

Från: Anno Sportel [mailto:anno.spoel@hsbcssad.com]
Skickat: den 26 augusti 2015 14:45
Till: Isacson Leiff
Ämne: RE: Week 36

Blah-blah-blah\
`;
    return expect(planer.extractFromPlain(msgBody)).to.equal('Allo! Follow up MIME!');
  });

  it('understands French date person wrote splitters', () => {
    const msgBody = `Lorem ipsum

Le 23 janv. 2015 à 22:03, Brendan xxx <brendan.xxx@xxx.com<mailto:brendan.xxx@xxx.com>> a écrit:

Bonjour!`;
    return expect(planer.extractFromPlain(msgBody)).to.equal('Lorem ipsum');
  });

  it('understands Polish date person wrote splitters', () => {
    const msgBody = `Lorem ipsum

W dniu 28 stycznia 2015 01:53 użytkownik Zoe xxx <zoe.xxx@xxx.com>
napisał:

Blah!`;
    return expect(planer.extractFromPlain(msgBody)).to.equal('Lorem ipsum');
  });

  it('understands Swedish date person wrote splitters', () => {
    const msgBody = `Lorem
Den 14 september, 2015 02:23:18, Valentino Rudy (valentino@rudy.be) skrev:

Veniam laborum mlkshk kale chips authentic. Normcore mumblecore laboris, fanny pack readymade eu blog chia pop-up freegan enim master cleanse.`;
    return expect(planer.extractFromPlain(msgBody)).to.equal('Lorem');
  });

  it('understands Norwegian date person wrote splitters', () => {
    const msgBody = `Lorem
På 14 september 2015 på 02:23:18, Valentino Rudy (valentino@rudy.be) skrev:

Veniam laborum mlkshk kale chips authentic. Normcore mumblecore laboris, fanny pack readymade eu blog chia pop-up freegan enim master cleanse.`;
    return expect(planer.extractFromPlain(msgBody)).to.equal('Lorem');
  });

  it('understands Norwegian date person wrote splitters', () => {
    const msgBody = `Gluten-free culpa lo-fi et nesciunt nostrud.

Op 17-feb.-2015, om 13:18 heeft Julius Caesar <pantheon@rome.com> het volgende geschreven:

Small batch beard laboris tempor, non listicle hella Tumblr heirloom. `;
    return expect(planer.extractFromPlain(msgBody)).to.equal(
      'Gluten-free culpa lo-fi et nesciunt nostrud.'
    );
  });

  it('is not fooled by fake quotations', () => {
    const msgBody = `Visit us now for assistance...
>>> >>>  http://www.domain.com <<<
Visit our site by clicking the link above`;

    return expect(planer.extractFromPlain(msgBody)).to.equal(msgBody);
  });

  it('is not fooled into thinking a link ends a quotation', () => {
    let msgBody = `8.45am-1pm

From: somebody@example.com

<http://email.example.com/c/dHJhY2tpbmdfY29kZT1mMDdjYzBmNzM1ZjYzMGIxNT
>  <bob@example.com <mailto:bob@example.com> >

Requester: `;

    expect(planer.extractFromPlain(msgBody)).to.equal('8.45am-1pm');

    msgBody = `Blah

On Thursday, October 25, 2012 at 3:03 PM, life is short. on Bob wrote:

>
> Post a response by replying to this email
>
 (http://example.com/c/YzOTYzMmE) >
> life is short. (http://example.com/c/YzMmE)
>\
`;
    expect(planer.extractFromPlain(msgBody)).to.equal('Blah');

    msgBody = `Blah

On Monday, 24 September, 2012 at 3:46 PM, bob wrote:

> [Ticket #50] test from bob
>
> View ticket (http://example.com/action
_nonce=3dd518)
>\
`;
    return expect(planer.extractFromPlain(msgBody)).to.equal('Blah');
  });

  it('is ok with the og message block starting with a date', () => {
    const msgBody = `Blah

Date: Wed, 16 May 2012 00:15:02 -0600
To: klizhentas@example.com`;
    return expect(planer.extractFromPlain(msgBody)).to.equal('Blah');
  });

  it('is not fooled when stars surround headers', () => {
    const msgBody = `Hi

*From:* bob@example.com [mailto:
bob@example.com]
*Sent:* Wednesday, June 27, 2012 3:05 PM
*To:* travis@example.com
*Subject:* Hello\
`;
    return expect(planer.extractFromPlain(msgBody)).to.equal('Hi');
  });

  it('can handle weird dates in header block', () => {
    const msgBody = `Hi

Date: Fri=2C 28 Sep 2012 10:55:48 +0000
From: tickets@example.com
To: bob@example.com
Subject: [Ticket #8] Test
\
`;
    return expect(planer.extractFromPlain(msgBody)).to.equal('Hi');
  });

  it('preserves forwarded messages', () => {
    const msgBody = `FYI

---------- Forwarded message ----------
From: bob@example.com
Date: Tue, Sep 4, 2012 at 1:35 PM
Subject: Two
line subject
To: rob@example.com

Text`;
    return expect(planer.extractFromPlain(msgBody)).to.equal(msgBody);
  });

  it('is not fooled by forwards inside quotations', () => {
    const msgBody = `Blah

-----Original Message-----

FYI

---------- Forwarded message ----------
From: bob@example.com
Date: Tue, Sep 4, 2012 at 1:35 PM
Subject: Two
line subject
To: rob@example.com

Text`;
    return expect(planer.extractFromPlain(msgBody)).to.equal('Blah');
  });

  it('can handle a message with 2 links', () => {
    const msgBody = '<http://link1> <http://link2>';
    return expect(planer.extractFromPlain(msgBody)).to.equal(msgBody);
  });

  return it('does not throw errors on messages with malformed links', () => {
    const msgBody =
      'http://test.lever.co/YOU HAVE AN INTERVIEW TODAY\nhttps://test.lever.co/interviews/07a605a0-0d0a-00e8-00aa-f02ca5350180 is coming up today athttps://www.google.com/calendar/event?eid=Z2FrbzhxcW0000YwbmtmMDN1ZWZ2OHAycnMgbGV2Z0000W1vLmNvbV82am00000000hvY3RjN200000000Vjc00000Bn.\n\nhttps://test.lever.co/interviews/0000a5ab-000b-43aa-a00a-f020003aaa84';
    return expect(planer.extractFromPlain(msgBody)).to.equal(msgBody);
  });
});
