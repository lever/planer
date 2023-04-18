/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const htmlPlaner = require('./htmlPlaner');
const REGEXES = require('./regexes');

const SPLITTER_MAX_LINES = 4;
const MAX_LINES_COUNT = 1000;
const MAX_LINE_LENGTH = 200000;

/**
 * Extract actual message from email.
 *
 * Will use provided `contentType` to decide which algorithm to use (plain text or html).
 *
 * @param msgBody [String] the html content of the email
 * @param contentType [String] the contentType of the email. Only `text/plain` and `text/html` are supported.
 * @param dom [Document] the document object to use for html parsing.
 * @return [String] the text/html of the actual message without quotations
 */
export function extractFrom(
  // @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
  msgBody: $TSFixMeFromCoffee,
  // @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
  contentType: $TSFixMeFromCoffee,
  dom = null
) {
  if (contentType == null) {
    contentType = 'text/plain';
  }
  if (contentType === 'text/plain') {
    return exports.extractFromPlain(msgBody);
  } else if (contentType === 'text/html') {
    return exports.extractFromHtml(msgBody, dom);
  } else {
    console.warn('Unknown contentType', contentType);
  }

  return msgBody;
}

/**
 * Extract actual message from provided textual email.
 *
 * Store delimiter used by the email (\n or \r\n),
 * split the email into lines,
 * use regexes to mark each line as either part of the message or quotation,
 * remove lines that are part of the quotation,
 * put message back together using the saved delimeter,
 * remove changes made by algorithm.
 *
 * @param msgBody [String] the html content of the email
 * @return [String] the text of the message without quotations
 */
// @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
export function extractFromPlain(msgBody: $TSFixMeFromCoffee) {
  const delimiter = getDelimiter(msgBody);
  // @ts-expect-error TS(2554): Expected 3 arguments, but got 2.
  msgBody = preprocess(msgBody, delimiter);

  let lines = msgBody.split(delimiter, MAX_LINES_COUNT);
  const markers = exports.markMessageLines(lines);
  lines = exports.processMarkedLines(lines, markers);

  msgBody = lines.join(delimiter);
  msgBody = postprocess(msgBody);
  return msgBody;
}

/**
 * Extract actual message from provided html message body
 * using tags and plain text algorithm.
 *
 * Cut out the 'blockquote', 'gmail_quote' tags.
 * Cut out Microsoft (Outlook, Windows mail) quotations.
 *
 * Then use plain text algorithm to cut out splitter or
 * leftover quotation.
 * This works by adding checkpoint text to all html tags,
 * then converting html to text,
 * then extracting quotations from text,
 * then checking deleted checkpoints,
 * then deleting necessary tags.
 *
 * Will use the document provided to create a new document using:
 * Document.implementation.createHTMLDocument()
 *
 * @param msgBody [String] the html content of the email
 * @param dom [Document] a document object or equivalent implementation.
 *   Must respond to `DOMImplementation.createHTMLDocument()`.
 *   @see https://developer.mozilla.org/en-US/docs/Web/API/DOMImplementation/createHTMLDocument
 */
// @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
export function extractFromHtml(msgBody: $TSFixMeFromCoffee, dom: $TSFixMeFromCoffee) {
  let crlfReplaced;
  if (dom == null) {
    console.error('No dom provided to parse html.');
    return msgBody;
  }

  if (msgBody.trim() === '') {
    return msgBody;
  }

  [msgBody, crlfReplaced] = Array.from(_CRLF_to_LF(msgBody));
  const emailDocument = htmlPlaner.createEmailDocument(msgBody, dom);

  // TODO: this check does not handle cases of emails between various email providers well because
  // it will find whichever splitter comes first in this list, not necessarily the top-most and stop
  // checking for others. Possible solution is to use something like compareByDomPosition from htmlPlaner
  // to find the earliest splitter in the DOM.
  const haveCutQuotations =
    htmlPlaner.cutGmailQuote(emailDocument) ||
    htmlPlaner.cutBlockQuote(emailDocument) ||
    htmlPlaner.cutMicrosoftQuote(emailDocument) ||
    htmlPlaner.cutById(emailDocument) ||
    htmlPlaner.cutFromBlock(emailDocument);

  // Create unaltered copy of email document
  const emailDocumentCopy = htmlPlaner.createEmailDocument(
    emailDocument.documentElement.outerHTML,
    dom
  );

  // Add checkpoints to html document
  const numberOfCheckpoints = htmlPlaner.addCheckpoints(emailDocument.body, 0);
  const quotationCheckpoints = Array.apply(null, Array(numberOfCheckpoints)).map(() => false);

  // Get plain text version to put through plain text algorithm
  htmlPlaner.replaceBreakTagsWithLineFeeds(emailDocument);
  let plainTextMsg = emailDocument.body.textContent;
  plainTextMsg = preprocess(plainTextMsg, '\n', 'text/html');
  let lines = plainTextMsg.split('\n');

  if (lines.length > MAX_LINES_COUNT) {
    return msgBody;
  }

  // Collect checkpoints for each line
  const lineCheckpoints = new Array(lines.length);
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const matches = line.match(htmlPlaner.CHECKPOINT_PATTERN) || [];
    // @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
    lineCheckpoints[index] = matches.map((match: $TSFixMeFromCoffee) =>
      parseInt(match.slice(4, -4))
    );
  }

  // Remove checkpoints from lines to pass through plain text algorithm
  // @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
  lines = lines.map((line: $TSFixMeFromCoffee) => line.replace(htmlPlaner.CHECKPOINT_PATTERN, ''));

  const markers = exports.markMessageLines(lines);
  const returnFlags = {};
  exports.processMarkedLines(lines, markers, returnFlags);

  // No lines deleted by plain text algorithm, ready to return
  // @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
  if (!(returnFlags as $TSFixMeFromCoffee).wereLinesDeleted) {
    if (haveCutQuotations) {
      // If we cut a quotation element out of the html, return the html output of the copied document.
      return _restore_CRLF(emailDocumentCopy.documentElement.outerHTML, crlfReplaced);
    } else {
      // There was nothing to remove, return original message.
      return msgBody;
    }
  }

  // Set quotationCheckpoints to true for checkpoints on lines that were removed
  for (
    // @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
    let i = (returnFlags as $TSFixMeFromCoffee).firstLine,
      // @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
      end = (returnFlags as $TSFixMeFromCoffee).lastLine,
      // @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
      asc = (returnFlags as $TSFixMeFromCoffee).firstLine <= end;
    asc ? i <= end : i >= end;
    asc ? i++ : i--
  ) {
    if (!lineCheckpoints[i]) {
      continue;
    }
    for (const checkpoint of Array.from(lineCheckpoints[i])) {
      // @ts-expect-error TS(2538): Type 'unknown' cannot be used as an index type.
      quotationCheckpoints[checkpoint] = true;
    }
  }

  // Remove the element that have been identified as part of the quoted message
  htmlPlaner.deleteQuotationTags(emailDocumentCopy.body, 0, quotationCheckpoints);

  return emailDocumentCopy.documentElement.outerHTML;
}

/**
 * Mark message lines with markers to distinguish quotation lines.
 *
 * Markers:
 * * e - empty line
 * * f - Forwarded message line, see REGEXES.FWD
 * * m - line that starts with quotation marker '>'
 * * s - splitter line
 * * t - presumably lines from the last message in the conversation
 *
 * $> markMessageLines(['answer', 'From: foo@bar.com', '', '> question'])
 *    'tsem'
 *
 */
// @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
export function markMessageLines(lines: $TSFixMeFromCoffee) {
  const markers = [];
  let i = 0;
  while (i < lines.length) {
    if (lines[i].trim() === '') {
      markers[i] = 'e'; // empty line
    } else if (REGEXES.QUOT_PATTERN.test(lines[i])) {
      markers[i] = 'm'; // line with quotation marker
    } else if (REGEXES.FWD.test(lines[i])) {
      markers[i] = 'f'; // ---- Forwarded message ----
    } else {
      const splitter = isSplitter(lines.slice(i, i + SPLITTER_MAX_LINES).join('\n'));
      if (splitter) {
        // splitter[0] is the entire match
        const splitterLines = splitter[0].split('\n');
        for (
          let j = 0, end = splitterLines.length, asc = 0 <= end;
          asc ? j <= end : j >= end;
          asc ? j++ : j--
        ) {
          markers[i + j] = 's';
        }

        i += splitterLines.length - 1;
      } else {
        markers[i] = 't';
      }
    }

    i++;
  }

  return markers.join('');
}

// @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
function isSplitter(line: $TSFixMeFromCoffee) {
  if (line.length > MAX_LINE_LENGTH) {
    return null;
  }
  for (const pattern of Array.from(REGEXES.SPLITTER_PATTERNS)) {
    // @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
    const matchArray = (pattern as $TSFixMeFromCoffee).exec(line);
    if (matchArray && matchArray.index === 0) {
      return matchArray;
    }
  }

  return null;
}

/**
 * Run regexes against message's marked lines to strip quotations.
 *
 * Return only last message lines.
 * $> processMarkedLines(['Hello', 'From: foo@bar.com', '', '> Hi'], 'tsem'])
 * ['Hello']
 *
 * Will also modify the provided returnFlags object and set the following properties:
 * returnFlags = { wereLinesDeleted: (true|false), firstLine: (Number), lastLine: (Number) }
 * @see setReturnFlags
 */
export function processMarkedLines(
  // @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
  lines: $TSFixMeFromCoffee,
  // @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
  markers: $TSFixMeFromCoffee,
  // @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
  returnFlags: $TSFixMeFromCoffee
) {
  // If there are no splitters there should be no markers
  let inlineReplyMatch;
  if (returnFlags == null) {
    returnFlags = {};
  }
  if (markers.indexOf('s') < 0 && !/(me*){3}/.test(markers)) {
    markers = markers.replace(/m/g, 't');
  }

  // If the message is a forward do nothing.
  if (/^[te]*f/.test(markers)) {
    setReturnFlags(returnFlags, false, -1, -1);
    return lines;
  }

  // Find inline replies (tm's following the first m in markers string)
  const inlineMatchRegex = new RegExp('m(?=e*((?:t+e*)+)m)', 'g');
  while ((inlineReplyMatch = inlineMatchRegex.exec(lines))) {
    const inlineReplyIndex = markers.indexOf(inlineReplyMatch[1], inlineReplyMatch.index);
    let isInlineReplyLink = false;

    if (inlineReplyIndex > -1) {
      isInlineReplyLink =
        REGEXES.PARENTHESIS_LINK.test(lines[inlineReplyIndex - 1]) ||
        lines[inlineReplyIndex].trim().search(REGEXES.PARENTHESIS_LINK) === 0;
    }

    if (!isInlineReplyLink) {
      setReturnFlags(returnFlags, false, -1, -1);
      return lines;
    }
  }

  // Cut out text lines coming after splitter if there are no markers there
  let quotationMatch = new RegExp('(se*)+((t|f)+e*)+', 'g').exec(markers);
  if (quotationMatch) {
    setReturnFlags(returnFlags, true, quotationMatch.index, lines.length);
    return lines.slice(0, quotationMatch.index);
  }

  // Handle the case with markers
  quotationMatch = REGEXES.QUOTATION.exec(markers) || REGEXES.EMPTY_QUOTATION.exec(markers);
  if (quotationMatch) {
    const quotationEnd = quotationMatch.index + quotationMatch[1].length;
    setReturnFlags(returnFlags, true, quotationMatch.index, quotationEnd);
    return lines.slice(0, quotationMatch.index).concat(lines.slice(quotationEnd));
  }

  setReturnFlags(returnFlags, false, -1, -1);
  return lines;
}

function setReturnFlags(
  // @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
  returnFlags: $TSFixMeFromCoffee,
  // @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
  wereLinesDeleted: $TSFixMeFromCoffee,
  // @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
  firstLine: $TSFixMeFromCoffee,
  // @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
  lastLine: $TSFixMeFromCoffee
) {
  returnFlags.wereLinesDeleted = wereLinesDeleted;
  returnFlags.firstLine = firstLine;
  return (returnFlags.lastLine = lastLine);
}

function preprocess(
  // @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
  msgBody: $TSFixMeFromCoffee,
  // @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
  delimiter: $TSFixMeFromCoffee,
  // @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
  contentType: $TSFixMeFromCoffee
) {
  // Normalize links i.e. replace '<', '>' wrapping the link with some symbols
  // so that '>' closing the link couldn't be mistakenly taken for quotation
  // marker.
  // REGEXES.LINK has 1 captured group
  if (contentType == null) {
    contentType = 'text/plain';
  }
  msgBody = msgBody.replace(
    REGEXES.LINK,
    (
      // @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
      entireMatch: $TSFixMeFromCoffee,
      // @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
      groupMatch1: $TSFixMeFromCoffee,
      // @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
      matchIndex: $TSFixMeFromCoffee
    ) => {
      // Look for closest newline character
      const newLineIndex = msgBody.lastIndexOf('\n', matchIndex);
      // If the new current line starts with a '>' quotation marker, don't mess with the link
      if (newLineIndex > 0 && msgBody[newLineIndex + 1] === '>') {
        return entireMatch;
      } else {
        return `@@${groupMatch1}@@`;
      }
    }
  );

  if (contentType === 'text/plain' && msgBody.length < MAX_LINE_LENGTH) {
    // ON_DATE_SMB_WROTE has 4 captured groups
    msgBody = msgBody.replace(
      REGEXES.ON_DATE_SMB_WROTE,
      (
        // @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
        entireMatch: $TSFixMeFromCoffee,
        // @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
        groupMatch1: $TSFixMeFromCoffee,
        // @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
        groupMatch2: $TSFixMeFromCoffee,
        // @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
        groupMatch3: $TSFixMeFromCoffee,
        // @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
        groupMatch4: $TSFixMeFromCoffee,
        // @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
        matchIndex: $TSFixMeFromCoffee
      ) => {
        if (matchIndex && msgBody[matchIndex - 1] !== '\n') {
          return `${delimiter}${entireMatch}`;
        } else {
          return entireMatch;
        }
      }
    );
  }

  return msgBody;
}

// @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
function postprocess(msgBody: $TSFixMeFromCoffee) {
  return msgBody.replace(REGEXES.NORMALIZED_LINK, '<$1>').trim();
}

const CONTENT_CHUNK_SIZE = 100;

// @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
function getDelimiter(msgBody: $TSFixMeFromCoffee) {
  let delimiterMatch;
  const contentLength = msgBody.length;
  let currentIndex = 0;
  let bodyChunk = msgBody.substr(currentIndex, CONTENT_CHUNK_SIZE);
  while (!(delimiterMatch = REGEXES.DELIMITER.exec(bodyChunk)) && currentIndex < contentLength) {
    currentIndex += CONTENT_CHUNK_SIZE;
    bodyChunk = msgBody.substr(currentIndex, CONTENT_CHUNK_SIZE);
  }

  if (delimiterMatch) {
    return delimiterMatch[0];
  } else {
    return '\n';
  }
}

// @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
function _CRLF_to_LF(msgBody: $TSFixMeFromCoffee) {
  const delimiter = getDelimiter(msgBody);
  if (delimiter === '\r\n') {
    return [msgBody.replace(new RegExp(delimiter, 'g'), '\n'), true];
  }
  return [msgBody, false];
}

// @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
function _restore_CRLF(msgBody: $TSFixMeFromCoffee, replaced: $TSFixMeFromCoffee) {
  if (replaced == null) {
    replaced = true;
  }
  if (replaced) {
    return msgBody.replace(new RegExp('\n', 'g'), '\r\n');
  }
  return msgBody;
}
