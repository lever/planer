htmlPlaner = require './htmlPlaner'
REGEXES = require './regexes'

SPLITTER_MAX_LINES = 4
MAX_LINES_COUNT = 1000
MAX_LINE_LENGTH = 200000

# Extract actual message from email.
#
# Will use provided `contentType` to decide which algorithm to use (plain text or html).
#
# @param msgBody [String] the html content of the email
# @param contentType [String] the contentType of the email. Only `text/plain` and `text/html` are supported.
# @param dom [Document] the document object to use for html parsing.
# @return [String] the text/html of the actual message without quotations
exports.extractFrom = (msgBody, contentType= 'text/plain', dom = null) ->
  if contentType == 'text/plain'
    return exports.extractFromPlain msgBody
  else if contentType == 'text/html'
    return exports.extractFromHtml msgBody, dom
  else
    console.warn('Unknown contentType', contentType)

  return msgBody

# Extract actual message from provided textual email.
#
# Store delimiter used by the email (\n or \r\n),
# split the email into lines,
# use regexes to mark each line as either part of the message or quotation,
# remove lines that are part of the quotation,
# put message back together using the saved delimeter,
# remove changes made by algorithm.
#
# @param msgBody [String] the html content of the email
# @return [String] the text of the message without quotations
exports.extractFromPlain = (msgBody) ->
  delimiter = getDelimiter msgBody
  msgBody = preprocess msgBody, delimiter

  lines = msgBody.split delimiter, MAX_LINES_COUNT
  markers = exports.markMessageLines lines
  lines = exports.processMarkedLines lines, markers

  msgBody = lines.join delimiter
  msgBody = postprocess msgBody
  return msgBody

# Extract actual message from provided html message body
# using tags and plain text algorithm.
#
# Cut out the 'blockquote', 'gmail_quote' tags.
# Cut out Microsoft (Outlook, Windows mail) quotations.
#
# Then use plain text algorithm to cut out splitter or
# leftover quotation.
# This works by adding checkpoint text to all html tags,
# then converting html to text,
# then extracting quotations from text,
# then checking deleted checkpoints,
# then deleting necessary tags.
#
# Will use the document provided to create a new document using:
# Document.implementation.createHTMLDocument()
#
# @param msgBody [String] the html content of the email
# @param dom [Document] a document object or equivalent implementation.
#   Must respond to `DOMImplementation.createHTMLDocument()`.
#   @see https://developer.mozilla.org/en-US/docs/Web/API/DOMImplementation/createHTMLDocument
exports.extractFromHtml = (msgBody, dom) ->
  unless dom?
    console.error("No dom provided to parse html.")
    return msgBody

  if msgBody.trim() == ''
    return msgBody

  [msgBody, crlfReplaced] = _CRLF_to_LF msgBody
  emailDocument = htmlPlaner.createEmailDocument msgBody, dom

  # TODO: this check does not handle cases of emails between various email providers well because
  # it will find whichever splitter comes first in this list, not necessarily the top-most and stop
  # checking for others. Possible solution is to use something like compareByDomPosition from htmlPlaner
  # to find the earliest splitter in the DOM.
  haveCutQuotations = (
    htmlPlaner.cutGmailQuote(emailDocument) ||
    htmlPlaner.cutBlockQuote(emailDocument) ||
    htmlPlaner.cutMicrosoftQuote(emailDocument) ||
    htmlPlaner.cutById(emailDocument) ||
    htmlPlaner.cutFromBlock(emailDocument)
  )

  # Create unaltered copy of email document
  emailDocumentCopy = htmlPlaner.createEmailDocument emailDocument.documentElement.outerHTML, dom

  # Add checkpoints to html document
  numberOfCheckpoints = htmlPlaner.addCheckpoints emailDocument.body, 0
  quotationCheckpoints = Array.apply(null, Array(numberOfCheckpoints)).map(-> false)

  # Get plain text version to put through plain text algorithm
  htmlPlaner.replaceBreakTagsWithLineFeeds(emailDocument)
  plainTextMsg = emailDocument.body.textContent
  plainTextMsg = preprocess plainTextMsg, "\n", 'text/html'
  lines = plainTextMsg.split '\n'

  if lines.length > MAX_LINES_COUNT
    return msgBody

  # Collect checkpoints for each line
  lineCheckpoints = new Array(lines.length)
  for line, index in lines
    matches = line.match(htmlPlaner.CHECKPOINT_PATTERN) || []
    lineCheckpoints[index] = matches.map((match) -> parseInt(match.slice(4, -4)))

  # Remove checkpoints from lines to pass through plain text algorithm
  lines = lines.map((line) -> line.replace(htmlPlaner.CHECKPOINT_PATTERN, ''))

  markers = exports.markMessageLines lines
  returnFlags = {}
  exports.processMarkedLines(lines, markers, returnFlags)

  # No lines deleted by plain text algorithm, ready to return
  if !returnFlags.wereLinesDeleted
    if haveCutQuotations
      # If we cut a quotation element out of the html, return the html output of the copied document.
      return _restore_CRLF(emailDocumentCopy.documentElement.outerHTML, crlfReplaced)
    else
      # There was nothing to remove, return original message.
      return msgBody

  # Set quotationCheckpoints to true for checkpoints on lines that were removed
  for i in [returnFlags.firstLine..returnFlags.lastLine]
    continue unless lineCheckpoints[i]
    for checkpoint in lineCheckpoints[i]
      quotationCheckpoints[checkpoint] = true

  # Remove the element that have been identified as part of the quoted message
  htmlPlaner.deleteQuotationTags emailDocumentCopy.body, 0, quotationCheckpoints

  return emailDocumentCopy.documentElement.outerHTML

# Mark message lines with markers to distinguish quotation lines.
#
# Markers:
# * e - empty line
# * f - Forwarded message line, see REGEXES.FWD
# * m - line that starts with quotation marker '>'
# * s - splitter line
# * t - presumably lines from the last message in the conversation
#
# $> markMessageLines(['answer', 'From: foo@bar.com', '', '> question'])
#    'tsem'
#
exports.markMessageLines = (lines) ->
  markers = []
  i = 0
  while i < lines.length
    if lines[i].trim() == ''
      markers[i] = 'e' # empty line
    else if REGEXES.QUOT_PATTERN.test(lines[i])
      markers[i] = 'm' # line with quotation marker
    else if REGEXES.FWD.test(lines[i])
      markers[i] = 'f' # ---- Forwarded message ----
    else
      splitter = isSplitter(lines.slice(i, i + SPLITTER_MAX_LINES).join("\n"))
      if splitter
        # splitter[0] is the entire match
        splitterLines = splitter[0].split("\n")
        for j in [0..splitterLines.length]
          markers[i + j] = 's'

        i += (splitterLines.length - 1)
      else
        markers[i] = 't'

    i++

  return markers.join('')

# Check the line for each splitter regex.
isSplitter = (line) ->
  return null if line.length > MAX_LINE_LENGTH
  for pattern in REGEXES.SPLITTER_PATTERNS
    matchArray = pattern.exec line
    if matchArray && matchArray.index == 0
      return matchArray

  return null

# Run regexes against message's marked lines to strip quotations.
#
# Return only last message lines.
# $> processMarkedLines(['Hello', 'From: foo@bar.com', '', '> Hi'], 'tsem'])
# ['Hello']
#
# Will also modify the provided returnFlags object and set the following properties:
# returnFlags = { wereLinesDeleted: (true|false), firstLine: (Number), lastLine: (Number) }
# @see setReturnFlags
exports.processMarkedLines = (lines, markers, returnFlags = {}) ->
  # If there are no splitters there should be no markers
  if markers.indexOf('s') < 0 && !/(me*){3}/.test(markers)
    markers = markers.replace(/m/g, 't')

  # If the message is a forward do nothing.
  if /^[te]*f/.test(markers)
    setReturnFlags returnFlags, false, -1, -1
    return lines

  # Find inline replies (tm's following the first m in markers string)
  # This RegExp is designed to find inline replies which are defined as messages that
  # contain new content (m) before and after some amount of quoted text (t)
  #
  # This RegExp is executed on the processed line markers,
  # rather than the raw message lines themselves
  # 
  # The RegExp can be broken into two parts. A middle part that is meant
  # to capture the quoted text, and the surrounding "m" markers.
  #
  # The (?=e*) is designated as a  non-capturing group, because we want 
  # the index of the match to be the start of the inline reply while
  # excluding any preceding empty lines ("e" markers).
  # The t[te]* is meant to capture any combination of t and e markers, with
  # the capture group starting at the first line of quoted text ("t" marker).
  #
  # Together, the previous two components of the RegExp capture the quoted text
  # To get the final RegExp, we surround those components with two "m" markers.
  inlineMatchRegex = new RegExp('m(?=e*(t[te]*)m)', 'g')
  while inlineReplyMatch = inlineMatchRegex.exec(markers)
    inlineReplyIndex = markers.indexOf(inlineReplyMatch[1], inlineReplyMatch.index)
    isInlineReplyLink = false

    if inlineReplyIndex > -1
      isInlineReplyLink =
        (REGEXES.PARENTHESIS_LINK.test(lines[inlineReplyIndex - 1]) ||
         lines[inlineReplyIndex].trim().search(REGEXES.PARENTHESIS_LINK) == 0)

    if !isInlineReplyLink
      setReturnFlags returnFlags, false, -1, -1
      return lines

  # Cut out text lines coming after splitter if there are no markers there
  quotationMatch = new RegExp('(se*)+((t|f)+e*)+', 'g').exec(markers)
  if quotationMatch
    setReturnFlags returnFlags, true, quotationMatch.index, lines.length
    return lines.slice(0, quotationMatch.index)

  # Handle the case with markers
  quotationMatch = REGEXES.QUOTATION.exec(markers) || REGEXES.EMPTY_QUOTATION.exec(markers)
  if quotationMatch
    quotationEnd = quotationMatch.index + quotationMatch[1].length
    setReturnFlags returnFlags, true, quotationMatch.index, quotationEnd
    return lines.slice(0, quotationMatch.index).concat(lines.slice(quotationEnd))

  setReturnFlags returnFlags, false, -1, -1
  return lines

setReturnFlags = (returnFlags, wereLinesDeleted, firstLine, lastLine) ->
  returnFlags.wereLinesDeleted = wereLinesDeleted
  returnFlags.firstLine = firstLine
  returnFlags.lastLine = lastLine

# Prepares msgBody for being stripped.
#
# Replaces link brackets so that they couldn't be taken for quotation marker.
# Splits line in two if splitter pattern preceded by some text on the same
# line (done only for 'On <date> <person> wrote:' pattern).
#
preprocess = (msgBody, delimiter, contentType = 'text/plain') ->
  # Normalize links i.e. replace '<', '>' wrapping the link with some symbols
  # so that '>' closing the link couldn't be mistakenly taken for quotation
  # marker.
  # REGEXES.LINK has 1 captured group
  msgBody = msgBody.replace REGEXES.LINK, (entireMatch, groupMatch1, matchIndex) ->
    # Look for closest newline character
    newLineIndex = msgBody.lastIndexOf("\n", matchIndex)
    # If the new current line starts with a '>' quotation marker, don't mess with the link
    if newLineIndex > 0 && msgBody[newLineIndex + 1] == '>'
      return entireMatch
    else
      return "@@#{ groupMatch1 }@@"

  if contentType == 'text/plain' && msgBody.length < MAX_LINE_LENGTH
    # ON_DATE_SMB_WROTE has 4 captured groups
    msgBody = msgBody.replace REGEXES.ON_DATE_SMB_WROTE, (entireMatch, groupMatch1, groupMatch2, groupMatch3, groupMatch4, groupMatch5, matchIndex) ->
      if matchIndex && msgBody[matchIndex - 1] != "\n"
        return "#{ delimiter }#{ entireMatch }"
      else
        return entireMatch

  return msgBody

# Make up for changes done at preprocessing message.
# Replace link brackets back to '<' and '>'.
postprocess = (msgBody) ->
  return msgBody.replace(REGEXES.NORMALIZED_LINK, '<$1>').trim()

CONTENT_CHUNK_SIZE = 100
getDelimiter = (msgBody) ->
  contentLength = msgBody.length
  currentIndex = 0
  bodyChunk = msgBody.substr(currentIndex, CONTENT_CHUNK_SIZE)
  while !(delimiterMatch = REGEXES.DELIMITER.exec(bodyChunk)) && currentIndex < contentLength
    currentIndex += CONTENT_CHUNK_SIZE
    bodyChunk = msgBody.substr(currentIndex, CONTENT_CHUNK_SIZE)

  if delimiterMatch
    return delimiterMatch[0]
  else
    return "\n"

_CRLF_to_LF = (msgBody) ->
  delimiter = getDelimiter msgBody
  if delimiter == '\r\n'
    return [msgBody.replace(new RegExp(delimiter, 'g'), '\n'), true]
  return [msgBody, false]

_restore_CRLF = (msgBody, replaced = true) ->
  if replaced
    return msgBody.replace(new RegExp('\n', 'g'), '\r\n')
  return msgBody

