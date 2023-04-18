/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
const CHECKPOINT_PREFIX = '#!%!';
const CHECKPOINT_SUFFIX = '!%!#';
export const CHECKPOINT_PATTERN = new RegExp(`${CHECKPOINT_PREFIX}\\d+${CHECKPOINT_SUFFIX}`, 'g');

// HTML quote indicators (tag ids)
const QUOTE_IDS = ['OLK_SRC_BODY_SECTION'];

/** Create an instance of Document using the message html and the injected base document */
// @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
export function createEmailDocument(msgBody: $TSFixMeFromCoffee, dom: $TSFixMeFromCoffee) {
  const emailDocument = dom.implementation.createHTMLDocument();

  // Write html of email to `html` element
  const [htmlElement] = Array.from(emailDocument.getElementsByTagName('html'));
  // @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
  (htmlElement as $TSFixMeFromCoffee).innerHTML = msgBody.trim();

  // Get the body element (will be created if not in the supplied html) and assign it to document.body for ease of use
  // if not already done by the dom implementation
  if (emailDocument.body == null) {
    const [emailBodyElement] = Array.from(emailDocument.getElementsByTagName('body'));
    emailDocument.body = emailBodyElement;
  }

  // Remove 'head' element from document
  const [head] = Array.from(emailDocument.getElementsByTagName('head'));
  if (head) {
    emailDocument.documentElement.removeChild(head);
  }

  return emailDocument;
}

/** Recursively adds checkpoints to html tree. */
// @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
export function addCheckpoints(htmlNode: $TSFixMeFromCoffee, counter: $TSFixMeFromCoffee) {
  // 3 is a text node
  if (htmlNode.nodeType === 3) {
    htmlNode.nodeValue = `${htmlNode.nodeValue.trim()}${CHECKPOINT_PREFIX}${counter}${CHECKPOINT_SUFFIX}\n`;
    counter++;
  }

  // 1 is an element
  if (htmlNode.nodeType === 1) {
    // Pad with spacing to ensure there are text nodes at the begining and end of non-body elements
    if (!hasTagName(htmlNode, 'body')) {
      htmlNode.innerHTML = `  ${htmlNode.innerHTML}  `;
    }
    // Ensure that there are text nodes between sibling elements
    ensureTextNodeBetweenChildElements(htmlNode);
    for (const childNode of Array.from(htmlNode.childNodes)) {
      counter = exports.addCheckpoints(childNode, counter);
    }
  }

  return counter;
}

export function deleteQuotationTags(
  // @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
  htmlNode: $TSFixMeFromCoffee,
  // @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
  counter: $TSFixMeFromCoffee,
  // @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
  quotationCheckpoints: $TSFixMeFromCoffee
) {
  let childNode, quotationChildren;
  let tagInQuotation = true;

  // 3 is a text node
  if (htmlNode.nodeType === 3) {
    if (!quotationCheckpoints[counter]) {
      tagInQuotation = false;
    }
    counter++;
    return [counter, tagInQuotation];
  }

  // 1 is an element
  if (htmlNode.nodeType === 1) {
    // Collect child nodes that are marked as in the quotation
    let childTagInQuotation = false;
    quotationChildren = [];

    // Pad with spacing to ensure there are text nodes at the begining and end of non-body elements
    if (!hasTagName(htmlNode, 'body')) {
      htmlNode.innerHTML = `  ${htmlNode.innerHTML}  `;
    }
    // Ensure that there are text nodes between sibling elements
    ensureTextNodeBetweenChildElements(htmlNode);

    for (childNode of Array.from(htmlNode.childNodes)) {
      [counter, childTagInQuotation] = Array.from(
        exports.deleteQuotationTags(childNode, counter, quotationCheckpoints)
      );
      // Keep tracking if all children are in the quotation
      tagInQuotation = tagInQuotation && childTagInQuotation;
      if (childTagInQuotation) {
        quotationChildren.push(childNode);
      }
    }
  }

  // If all of an element's children are part of a quotation, let parent delete whole element
  if (tagInQuotation) {
    return [counter, tagInQuotation];
  } else {
    // Otherwise, delete specific quotation children
    // @ts-expect-error TS(2769): No overload matches this call.
    for (childNode of Array.from(quotationChildren)) {
      htmlNode.removeChild(childNode);
    }
    return [counter, tagInQuotation];
  }
}

// @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
export function cutGmailQuote(emailDocument: $TSFixMeFromCoffee) {
  const nodesArray = emailDocument.getElementsByClassName('gmail_quote');
  if (!(nodesArray.length > 0)) {
    return false;
  }

  removeNodes(nodesArray);
  return true;
}

// @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
export function cutMicrosoftQuote(emailDocument: $TSFixMeFromCoffee) {
  const splitterElement = findMicrosoftSplitter(emailDocument);
  if (splitterElement == null) {
    return false;
  }

  const { parentElement } = splitterElement;
  let afterSplitter = splitterElement.nextElementSibling;
  while (afterSplitter != null) {
    parentElement.removeChild(afterSplitter);
    afterSplitter = splitterElement.nextElementSibling;
  }

  parentElement.removeChild(splitterElement);
  return true;
}

/** Remove the last non-nested blockquote element */
// @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
export function cutBlockQuote(emailDocument: $TSFixMeFromCoffee) {
  const xpathQuery = '(.//blockquote)[not(ancestor::blockquote)][last()]';
  const xpathResult = emailDocument.evaluate(xpathQuery, emailDocument, null, 9, null);

  const blockquoteElement = xpathResult.singleNodeValue;
  if (blockquoteElement == null) {
    return false;
  }

  const div = emailDocument.createElement('div');

  const parent = blockquoteElement.parentElement;
  parent.removeChild(blockquoteElement);
  return true;
}

// @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
export function cutById(emailDocument: $TSFixMeFromCoffee) {
  let found = false;
  for (const quoteId of Array.from(QUOTE_IDS)) {
    const quoteElement = emailDocument.getElementById(quoteId);
    if (quoteElement != null) {
      found = true;
      quoteElement.parentElement.removeChild(quoteElement);
    }
  }

  return found;
}

// @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
export function cutFromBlock(emailDocument: $TSFixMeFromCoffee) {
  // Handle case where From: block is enclosed in a tag
  let fromBlock;
  let lastBlock;
  let xpathQuery =
    "//*[starts-with(normalize-space(.), 'From:')]|//*[starts-with(normalize-space(.), 'Date:')]";
  let xpathResult = emailDocument.evaluate(xpathQuery, emailDocument, null, 5, null);

  // Find last element in iterator
  while ((fromBlock = xpathResult.iterateNext())) {
    lastBlock = fromBlock;
  }

  if (lastBlock != null) {
    // Find parent div and remove from document
    const parentDiv = findParentDiv(lastBlock);

    if (parentDiv != null && !elementIsAllContent(parentDiv)) {
      parentDiv.parentElement.removeChild(parentDiv);
      return true;
    }
  }

  // Handle the case when From: block goes right after e.g. <hr> and is not enclosed in a tag itself
  xpathQuery =
    "//text()[starts-with(normalize-space(.), 'From:')]|//text()[starts-with(normalize-space(.), 'Date:')]";
  xpathResult = emailDocument.evaluate(xpathQuery, emailDocument, null, 9, null);

  // The text node that is the result
  const textNode = xpathResult.singleNodeValue;
  if (textNode == null) {
    return false;
  }

  // The text node is wrapped in a span element. All sorts formatting could be happening here.
  // Return false and hope plain text algorithm can figure it out.
  if (isTextNodeWrappedInSpan(textNode)) {
    return false;
  }

  // The previous sibling stopped the initial xpath query from working, so it is likely a splitter (like an hr)
  const splitterElement = textNode.previousSibling;
  splitterElement?.parentElement?.removeChild(splitterElement);

  // Remove all subsequent siblings of the textNode
  let afterSplitter = textNode.nextSibling;
  while (afterSplitter != null) {
    afterSplitter.parentNode.removeChild(afterSplitter);
    afterSplitter = textNode.nextSibling;
  }

  textNode.parentNode.removeChild(textNode);
  return true;
}

// @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
function findParentDiv(element: $TSFixMeFromCoffee) {
  while (element != null && element.parentElement != null) {
    if (hasTagName(element, 'div')) {
      return element;
    } else {
      element = element.parentElement;
    }
  }

  return null;
}

// @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
function elementIsAllContent(element: $TSFixMeFromCoffee) {
  const maybeBody = element.parentElement;
  return maybeBody != null && hasTagName(maybeBody, 'body') && maybeBody.childNodes.length === 1;
}

// @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
function isTextNodeWrappedInSpan(textNode: $TSFixMeFromCoffee) {
  const { parentElement } = textNode;

  return (
    parentElement != null &&
    hasTagName(parentElement, 'span') &&
    parentElement.childNodes.length === 1
  );
}

const BREAK_TAG_REGEX = new RegExp('<br\\s*[/]?>', 'gi');

// @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
export function replaceBreakTagsWithLineFeeds(emailDocument: $TSFixMeFromCoffee) {
  const currentHtml = emailDocument.body.innerHTML;
  return (emailDocument.body.innerHTML = currentHtml.replace(BREAK_TAG_REGEX, '\n'));
}

// Queries to find a splitter that's the only child of a single parent div
// Usually represents the dividing line between messages in the Outlook html
const OUTLOOK_SPLITTER_QUERY_SELECTORS = {
  outlook2007: "div[style='border:none;border-top:solid #B5C4DF 1.0pt;padding:3.0pt 0cm 0cm 0cm']",
  outlookForAndroid:
    "div[style='border:none;border-top:solid #E1E1E1 1.0pt;padding:3.0pt 0cm 0cm 0cm']",
  windowsMail:
    "div[style='padding-top: 5px; border-top-color: rgb(229, 229, 229); border-top-width: 1px; border-top-style: solid;']",
};

// More complicated Xpath queries for versions of Outlook that don't use the dividing lines
const OUTLOOK_XPATH_SPLITTER_QUERIES = {
  outlook2003:
    "//div/div[@class='MsoNormal' and @align='center' and @style='text-align:center']/font/span/hr[@size='3' and @width='100%' and @align='center' and @tabindex='-1']",
};

// For more modern versions of Outlook that contain replies in quote block with an id
const OUTLOOK_SPLITTER_QUOTE_IDS =
  // There's potentially multiple elements with this id so we need to cut everything after this quote as well
  { office365: '#divRplyFwdMsg' };

// @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
function findMicrosoftSplitter(emailDocument: $TSFixMeFromCoffee) {
  let _, splitterElement;
  const possibleSplitterElements = [];

  for (_ in OUTLOOK_SPLITTER_QUERY_SELECTORS) {
    // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    const querySelector = OUTLOOK_SPLITTER_QUERY_SELECTORS[_];
    if ((splitterElement = findOutlookSplitterWithQuerySelector(emailDocument, querySelector))) {
      possibleSplitterElements.push(splitterElement);
    }
  }

  for (_ in OUTLOOK_XPATH_SPLITTER_QUERIES) {
    // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    const xpathQuery = OUTLOOK_XPATH_SPLITTER_QUERIES[_];
    if ((splitterElement = findOutlookSplitterWithXpathQuery(emailDocument, xpathQuery))) {
      possibleSplitterElements.push(splitterElement);
    }
  }

  for (_ in OUTLOOK_SPLITTER_QUOTE_IDS) {
    // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    const quoteId = OUTLOOK_SPLITTER_QUOTE_IDS[_];
    if ((splitterElement = findOutlookSplitterWithQuoteId(emailDocument, quoteId))) {
      possibleSplitterElements.push(splitterElement);
    }
  }

  if (!possibleSplitterElements.length) {
    return null;
  }
  // Find the earliest splitter in the DOM to remove everything after it
  return possibleSplitterElements.sort(compareByDomPosition)[0];
}

const DOCUMENT_POSITION_PRECEDING = 2;
const DOCUMENT_POSITION_FOLLOWING = 4;

// @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
function compareByDomPosition(elementA: $TSFixMeFromCoffee, elementB: $TSFixMeFromCoffee) {
  const documentPositionComparison = elementA.compareDocumentPosition(elementB);
  if (documentPositionComparison & DOCUMENT_POSITION_PRECEDING) {
    return 1;
  } else if (documentPositionComparison & DOCUMENT_POSITION_FOLLOWING) {
    return -1;
  }

  return 0;
}

function findOutlookSplitterWithXpathQuery(
  // @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
  emailDocument: $TSFixMeFromCoffee,
  // @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
  xpathQuery: $TSFixMeFromCoffee
) {
  const xpathResult = emailDocument.evaluate(xpathQuery, emailDocument, null, 9, null);
  let splitterElement = xpathResult.singleNodeValue;

  // Go up the tree to find the enclosing div.
  if (splitterElement != null) {
    splitterElement = splitterElement.parentElement.parentElement;
    splitterElement = splitterElement.parentElement.parentElement;
  }

  return splitterElement;
}

function findOutlookSplitterWithQuerySelector(
  // @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
  emailDocument: $TSFixMeFromCoffee,
  // @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
  query: $TSFixMeFromCoffee
) {
  const splitterResult = emailDocument.querySelectorAll(query);

  if (!(splitterResult.length > 1)) {
    return;
  }

  let splitterElement = splitterResult[1];

  if (
    splitterElement.parentElement != null &&
    splitterElement === splitterElement.parentElement.children[0]
  ) {
    splitterElement = splitterElement.parentElement;
  }

  return splitterElement;
}

// @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
function findOutlookSplitterWithQuoteId(emailDocument: $TSFixMeFromCoffee, id: $TSFixMeFromCoffee) {
  const splitterResult = emailDocument.querySelectorAll(id);

  if (!splitterResult.length) {
    return;
  }
  return splitterResult[0];
}

// @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
function removeNodes(nodesArray: $TSFixMeFromCoffee) {
  return (() => {
    const result = [];
    for (
      let start = nodesArray.length - 1, index = start, asc = start <= 0;
      asc ? index <= 0 : index >= 0;
      asc ? index++ : index--
    ) {
      const node = nodesArray[index];
      result.push(node?.parentNode?.removeChild(node));
    }
    return result;
  })();
}

// @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
function ensureTextNodeBetweenChildElements(element: $TSFixMeFromCoffee) {
  let newTextNode;
  const dom = element.ownerDocument;
  let currentNode = element.childNodes[0];

  // This element has no children. Give it an empty text node.
  if (!currentNode) {
    newTextNode = dom.createTextNode(' ');
    element.appendChild(newTextNode);
    return;
  }

  return (() => {
    const result = [];
    while (currentNode.nextSibling) {
      // An element is followed by an element
      if (currentNode.nodeType === 1 && currentNode.nextSibling.nodeType === 1) {
        newTextNode = dom.createTextNode(' ');
        element.insertBefore(newTextNode, currentNode.nextSibling);
      }
      result.push((currentNode = currentNode.nextSibling));
    }
    return result;
  })();
}

// @ts-expect-error TS(2304): Cannot find name '$TSFixMeFromCoffee'.
function hasTagName(element: $TSFixMeFromCoffee, tagName: $TSFixMeFromCoffee) {
  return element.tagName.toLowerCase() === tagName;
}
