CHECKPOINT_PREFIX = '#!%!'
CHECKPOINT_SUFFIX = '!%!#'
exports.CHECKPOINT_PATTERN = new RegExp("#{ CHECKPOINT_PREFIX }\\d+#{ CHECKPOINT_SUFFIX }", 'g')

# HTML quote indicators (tag ids)
QUOTE_IDS = ['OLK_SRC_BODY_SECTION']

# Create an instance of Document using the message html and the injected base document
exports.createEmailDocument = (msgBody, dom) ->
  emailDocument = dom.implementation.createHTMLDocument()

  # Write html of email to `html` element
  [htmlElement] = emailDocument.getElementsByTagName('html');
  htmlElement.innerHTML = msgBody.trim();

  # Get the body element (will be created if not in the supplied html) and assign it to document.body for ease of use
  # if not already done by the dom implementation
  unless emailDocument.body?
    [emailBodyElement] = emailDocument.getElementsByTagName('body')
    emailDocument.body = emailBodyElement

  # Remove 'head' element from document
  [head] = emailDocument.getElementsByTagName('head')
  emailDocument.documentElement.removeChild(head) if head

  return emailDocument

# Recursively adds checkpoints to html tree.
exports.addCheckpoints = (htmlNode, counter) ->
  # 3 is a text node
  if htmlNode.nodeType == 3
    htmlNode.nodeValue = "#{ htmlNode.nodeValue.trim() }#{ CHECKPOINT_PREFIX }#{ counter }#{ CHECKPOINT_SUFFIX }\n"
    counter++

  # 1 is an element
  if htmlNode.nodeType == 1
    # Pad with spacing to ensure there are text nodes at the begining and end of non-body elements
    htmlNode.innerHTML = "  #{  htmlNode.innerHTML }  " unless hasTagName(htmlNode, 'body')
    # Ensure that there are text nodes between sibling elements
    ensureTextNodeBetweenChildElements(htmlNode)
    for childNode in htmlNode.childNodes
      counter = exports.addCheckpoints(childNode, counter)

  return counter

exports.deleteQuotationTags = (htmlNode, counter, quotationCheckpoints) ->
  tagInQuotation = true

  # 3 is a text node
  if htmlNode.nodeType == 3
    tagInQuotation = false unless quotationCheckpoints[counter]
    counter++
    return [counter, tagInQuotation]

  # 1 is an element
  if htmlNode.nodeType == 1
    # Collect child nodes that are marked as in the quotation
    childTagInQuotation = false
    quotationChildren = []

    # Pad with spacing to ensure there are text nodes at the begining and end of non-body elements
    htmlNode.innerHTML = "  #{  htmlNode.innerHTML }  " unless hasTagName(htmlNode, 'body')
    # Ensure that there are text nodes between sibling elements
    ensureTextNodeBetweenChildElements(htmlNode)

    for childNode in htmlNode.childNodes
      [counter, childTagInQuotation] = exports.deleteQuotationTags(childNode, counter, quotationCheckpoints)
      # Keep tracking if all children are in the quotation
      tagInQuotation = tagInQuotation && childTagInQuotation
      if childTagInQuotation
        quotationChildren.push childNode

  # If all of an element's children are part of a quotation, let parent delete whole element
  if tagInQuotation
    return [counter, tagInQuotation]
  else
    # Otherwise, delete specific quotation children
    for childNode in quotationChildren
      htmlNode.removeChild(childNode)
    return [counter, tagInQuotation]

exports.cutGmailQuote = (emailDocument) ->
  nodesArray = emailDocument.getElementsByClassName('gmail_quote')
  return false unless nodesArray.length > 0

  removeNodes(nodesArray)
  return true

exports.cutMicrosoftQuote = (emailDocument) ->
  splitterElement = findMicrosoftSplitter(emailDocument)
  return false unless splitterElement?

  parentElement = splitterElement.parentElement
  afterSplitter = splitterElement.nextElementSibling
  while afterSplitter?
    parentElement.removeChild(afterSplitter)
    afterSplitter = splitterElement.nextElementSibling

  parentElement.removeChild(splitterElement)
  return true

# Remove the last non-nested blockquote element
exports.cutBlockQuote = (emailDocument) ->
  xpathQuery = '(.//blockquote)[not(ancestor::blockquote)][last()]'
  xpathResult = emailDocument.evaluate(xpathQuery, emailDocument, null, 9, null)

  blockquoteElement = xpathResult.singleNodeValue
  return false unless blockquoteElement?

  div = emailDocument.createElement('div')

  parent = blockquoteElement.parentElement
  parent.removeChild(blockquoteElement)
  return true

exports.cutById = (emailDocument) ->
  found = false
  for quoteId in QUOTE_IDS
    quoteElement = emailDocument.getElementById(quoteId)
    if quoteElement?
      found = true
      quoteElement.parentElement.removeChild(quoteElement)

  return found

exports.cutFromBlock = (emailDocument) ->
  # Handle case where From: block is enclosed in a tag
  xpathQuery = "//*[starts-with(normalize-space(.), 'From:')]|//*[starts-with(normalize-space(.), 'Date:')]"
  xpathResult = emailDocument.evaluate(xpathQuery, emailDocument, null, 5, null)

  # Find last element in iterator
  while fromBlock = xpathResult.iterateNext()
    lastBlock = fromBlock

  if lastBlock?
    # Find parent div and remove from document
    parentDiv = findParentDiv(lastBlock)

    if parentDiv? && !elementIsAllContent(parentDiv)
      parentDiv.parentElement.removeChild(parentDiv)
      return true


    # Handle the case when From: block goes right after e.g. <hr> and is not enclosed in a tag itself
  xpathQuery = "//text()[starts-with(normalize-space(.), 'From:')]|//text()[starts-with(normalize-space(.), 'Date:')]"
  xpathResult = emailDocument.evaluate(xpathQuery, emailDocument, null, 9, null)

  # The text node that is the result
  textNode = xpathResult.singleNodeValue
  return false unless textNode?

  # The text node is wrapped in a span element. All sorts formatting could be happening here.
  # Return false and hope plain text algorithm can figure it out.
  return false if isTextNodeWrappedInSpan(textNode)

  # The previous sibling stopped the initial xpath query from working, so it is likely a splitter (like an hr)
  splitterElement = textNode.previousSibling
  splitterElement?.parentElement?.removeChild(splitterElement)

  # Remove all subsequent siblings of the textNode
  afterSplitter = textNode.nextSibling
  while afterSplitter?
    afterSplitter.parentNode.removeChild(afterSplitter)
    afterSplitter = textNode.nextSibling

  textNode.parentNode.removeChild(textNode)
  return true

findParentDiv = (element) ->
  while element? && element.parentElement?
    if hasTagName(element, 'div')
      return element
    else
      element = element.parentElement

  return null

elementIsAllContent = (element) ->
  maybeBody = element.parentElement
  return (
    maybeBody? &&
    hasTagName(maybeBody, 'body') &&
    maybeBody.childNodes.length == 1
  )

isTextNodeWrappedInSpan = (textNode) ->
  parentElement = textNode.parentElement

  return (
    parentElement? &&
    hasTagName(parentElement, 'span') &&
    parentElement.childNodes.length  == 1
  )

BREAK_TAG_REGEX = new RegExp('<br\\s*[/]?>', 'gi')

exports.replaceBreakTagsWithLineFeeds = (emailDocument) ->
  currentHtml = emailDocument.body.innerHTML
  emailDocument.body.innerHTML = currentHtml.replace BREAK_TAG_REGEX, "\n"

# Queries to find a splitter that's the only child of a single parent div
# Usually represents the dividing line between messages in the Outlook html
OUTLOOK_SPLITTER_QUERY_SELECTORS =
  outlook2007: "div[style='border:none;border-top:solid #B5C4DF 1.0pt;padding:3.0pt 0cm 0cm 0cm']"
  outlookForAndroid: "div[style='border:none;border-top:solid #E1E1E1 1.0pt;padding:3.0pt 0cm 0cm 0cm']"
  windowsMail: "div[style='padding-top: 5px; border-top-color: rgb(229, 229, 229); border-top-width: 1px; border-top-style: solid;']"

# More complicated Xpath queries for versions of Outlook that don't use the dividing lines
OUTLOOK_XPATH_SPLITTER_QUERIES =
  outlook2003: "//div/div[@class='MsoNormal' and @align='center' and @style='text-align:center']/font/span/hr[@size='3' and @width='100%' and @align='center' and @tabindex='-1']"

# For more modern versions of Outlook that contain replies in quote block with an id
OUTLOOK_SPLITTER_QUOTE_IDS =
  # There's potentially multiple elements with this id so we need to cut everything after this quote as well
  office365: '#divRplyFwdMsg'

findMicrosoftSplitter = (emailDocument) ->
  possibleSplitterElements = []

  for _, querySelector of OUTLOOK_SPLITTER_QUERY_SELECTORS
    if (splitterElement = findOutlookSplitterWithQuerySelector(emailDocument, querySelector))
      possibleSplitterElements.push splitterElement

  for _, xpathQuery of OUTLOOK_XPATH_SPLITTER_QUERIES
    if (splitterElement = findOutlookSplitterWithXpathQuery(emailDocument, xpathQuery))
      possibleSplitterElements.push splitterElement

  for _, quoteId of OUTLOOK_SPLITTER_QUOTE_IDS
    if (splitterElement = findOutlookSplitterWithQuoteId(emailDocument, quoteId))
      possibleSplitterElements.push splitterElement

  return null unless possibleSplitterElements.length
  # Find the earliest splitter in the DOM to remove everything after it
  return possibleSplitterElements.sort(compareByDomPosition)[0]

DOCUMENT_POSITION_PRECEDING = 2
DOCUMENT_POSITION_FOLLOWING = 4

compareByDomPosition = (elementA, elementB) ->
  documentPositionComparison = elementA.compareDocumentPosition(elementB)
  if (documentPositionComparison & DOCUMENT_POSITION_PRECEDING)
    return 1
  else if (documentPositionComparison & DOCUMENT_POSITION_FOLLOWING)
    return -1

  return 0

findOutlookSplitterWithXpathQuery = (emailDocument, xpathQuery) ->
  xpathResult = emailDocument.evaluate(xpathQuery, emailDocument, null, 9, null)
  splitterElement = xpathResult.singleNodeValue

  # Go up the tree to find the enclosing div.
  if splitterElement?
    splitterElement = splitterElement.parentElement.parentElement
    splitterElement = splitterElement.parentElement.parentElement

  return splitterElement

findOutlookSplitterWithQuerySelector = (emailDocument, query) ->
  splitterResult = emailDocument.querySelectorAll(query)

  return unless splitterResult.length > 1

  splitterElement = splitterResult[1]

  if splitterElement.parentElement? && splitterElement == splitterElement.parentElement.children[0]
    splitterElement = splitterElement.parentElement

  return splitterElement

findOutlookSplitterWithQuoteId = (emailDocument, id) ->
  splitterResult = emailDocument.querySelectorAll(id)

  return unless splitterResult.length
  return splitterResult[0]

removeNodes = (nodesArray) ->
  for index in [nodesArray.length - 1..0]
    node = nodesArray[index]
    node?.parentNode?.removeChild node

ensureTextNodeBetweenChildElements = (element) ->
  dom = element.ownerDocument
  currentNode = element.childNodes[0]

  # This element has no children. Give it an empty text node.
  if !currentNode
    newTextNode = dom.createTextNode(' ')
    element.appendChild(newTextNode)
    return

  while currentNode.nextSibling
    # An element is followed by an element
    if currentNode.nodeType == 1 && currentNode.nextSibling.nodeType == 1
      newTextNode = dom.createTextNode(' ');
      element.insertBefore(newTextNode, currentNode.nextSibling)
    currentNode = currentNode.nextSibling

hasTagName = (element, tagName) ->
  return element.tagName.toLowerCase() == tagName
