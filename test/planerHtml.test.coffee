{expect} = require 'chai'
fs = require 'fs'
jsdom = require 'jsdom'
path = require 'path'
planer = require '../src/planer'

describe 'planer#extractFromHtml', ->
  before 'configure jsdom', ->
    jsdom.defaultDocumentFeatures = {
      FetchExternalResources: false,
      ProcessExternalResources: false
    }
    @dom = new jsdom.JSDOM().window.document

  it 'should return an empty body when given an empty body', ->
    msgBody = ''
    expect(planer.extractFromHtml(msgBody, @dom)).to.equal('')

  it 'should return a the text of a message with splitter inside blockqouote', ->
    msgBody = """Reply
      <blockquote>

        <div>
          On 11-Apr-2011, at 6:54 PM, Bob &lt;bob@example.com&gt; wrote:
        </div>

        <div>
          Test
        </div>

      </blockquote>"""
    expect(planer.extractFromHtml(msgBody, @dom)).to.equal('<html><body>Reply\n</body></html>')

  it 'should return a the text of a message with splitter outside blockqouote', ->
    msgBody = """Reply

      <div>
        On 11-Apr-2011, at 6:54 PM, Bob &lt;bob@example.com&gt; wrote:
      </div>

      <blockquote>
        <div>
          Test
        </div>
      </blockquote>
      """
    expect(planer.extractFromHtml(msgBody, @dom)).to.equal('<html><body>Reply\n\n</body></html>')

  it 'should not be fooled by a regular blockquote', ->
    msgBody = """Reply
      <blockquote>Regular</blockquote>

      <div>
        On 11-Apr-2011, at 6:54 PM, Bob &lt;bob@example.com&gt; wrote:
      </div>

      <blockquote>
        <div>
          <blockquote>Nested</blockquote>
        </div>
      </blockquote>
      """
    expect(planer.extractFromHtml(msgBody, @dom)).to.equal("<html><body>Reply\n<blockquote>  Regular  </blockquote>\n\n</body></html>")

  it 'should not be fooled by a regular blockquote', ->
    msgBody = """
      <html>
      <body>
      Reply

      <div>
        On 11-Apr-2011, at 6:54 PM, Bob &lt;bob@example.com&gt; wrote:
      </div>

      <div>
        Test
      </div>
      </body>
      </html>
      """
    reply = """
      <html><body>
      Reply

      </body></html>"""
    expect(planer.extractFromHtml(msgBody, @dom)).to.equal(reply)

  it 'handles invalid html', ->
    msgBody = """Reply
      <div>
        On 11-Apr-2011, at 6:54 PM, Bob &lt;bob@example.com&gt; wrote:

          <blockquote>
            <div>
              Test
            </div>
          </blockquote>
      </div>

      <div/>
      """
    expect(planer.extractFromHtml(msgBody, @dom)).to.equal('<html><body>Reply\n<div>    </div></body></html>')

  it 'handles gmail quotes', ->
    msgBody = """Reply
      <div class="gmail_quote">
        <div class="gmail_quote">
          On 11-Apr-2011, at 6:54 PM, Bob &lt;bob@example.com&gt; wrote:
          <div>
            Test
          </div>
        </div>
      </div>"""

    expect(planer.extractFromHtml(msgBody, @dom)).to.equal('<html><body>Reply\n</body></html>')

  it 'does not miss a disclaimer after a blockquote', ->
    msgBody = """
      <html>
        <body>
        <div>
          <div>
            message
          </div>
          <blockquote>
            Quote
          </blockquote>
        </div>
        <div>
          disclaimer
        </div>
        </body>
      </html>
      """

    reply = "<html><body>\n  <div>\n    <div>\n      message\n    </div>\n    \n  </div>\n  <div>\n    disclaimer\n  </div>\n  \n</body></html>"

    expect(planer.extractFromHtml(msgBody, @dom)).to.equal(reply)

  it 'removes the tag with a quotation block that starts with "Date:"', ->
    msgBody = """
      <div>
        message<br>
        <div>
          <hr>
          Date: Fri, 23 Mar 2012 12:35:31 -0600<br>
          To: <a href="mailto:bob@example.com">bob@example.com</a><br>
          From: <a href="mailto:rob@example.com">rob@example.com</a><br>
          Subject: You Have New Mail From Mary!<br><br>

          text
        </div>
      </div>
      """

    reply = '<html><body><div>\n  message<br>\n  \n</div></body></html>'

    expect(planer.extractFromHtml(msgBody, @dom)).to.equal(reply)

  it 'removes the tag with a quotation block that starts with "From:"', ->
    msgBody = """<div>
      message<br>
      <div>
      <hr>
      From: <a href="mailto:bob@example.com">bob@example.com</a><br>
      Date: Fri, 23 Mar 2012 12:35:31 -0600<br>
      To: <a href="mailto:rob@example.com">rob@example.com</a><br>
      Subject: You Have New Mail From Mary!<br><br>

      text
      </div></div>
      """

    reply = '<html><body><div>\nmessage<br>\n</div></body></html>'

    expect(planer.extractFromHtml(msgBody, @dom)).to.equal(reply)

  it 'is not fooled if the reply shared a div with the quotation', ->
    msgBody = """
      <body>
        <div>

          Blah<br><br>

          <hr>Date: Tue, 22 May 2012 18:29:16 -0600<br>
          To: xx@hotmail.ca<br>
          From: quickemail@ashleymadison.com<br>
          Subject: You Have New Mail From x!<br><br>

        </div>
      </body>"""

    reply = """
      <html><body>
        <div>

          Blah<br><br>

          </div>
      </body></html>"""

    expect(planer.extractFromHtml(msgBody, @dom)).to.equal(reply)

  describe 'examples from files', ->
    absolutePath = (relativePath) ->
      path.join(__dirname, relativePath)

    it 'handles emails with numerous microsoft namespaces', ->
      replySnippet = 'Lorem ipsum dolor sit amet'
      originalMsgSnippet = 'Odio et pretium rutrum neque'

      msgBody = fs.readFileSync(absolutePath('examples/html/microsoft-namespaces.html'), 'utf8')
      expect(msgBody).to.contain(replySnippet)
      expect(msgBody).to.contain(originalMsgSnippet)

      extractedHtml = planer.extractFromHtml(msgBody, @dom)

      expect(extractedHtml).to.exist
      expect(extractedHtml).to.contain(replySnippet)
      expect(extractedHtml).not.to.contain(originalMsgSnippet)

    it 'handles emails from Office 365', ->
      replySnippet = "I really hope that you're doing well!"
      originalMsgSnippet = 'Do you like the holidays?'

      msgBody = fs.readFileSync(absolutePath('examples/html/office-365.html'), 'utf8')
      expect(msgBody).to.contain(replySnippet)
      expect(msgBody).to.contain(originalMsgSnippet)

      extractedHtml = planer.extractFromHtml(msgBody, @dom)

      expect(extractedHtml).to.exist
      expect(extractedHtml).to.contain(replySnippet)
      expect(extractedHtml).not.to.contain(originalMsgSnippet)

    it 'handles emails from various Outlook versions', ->
      replySnippet = 'This is how it looks on my emails'
      originalMsgSnippet = "We'd love to set up a quick phone call with you"

      msgBody = fs.readFileSync(absolutePath('examples/html/outlook-mixed.html'), 'utf8')
      expect(msgBody).to.contain(replySnippet)
      expect(msgBody).to.contain(originalMsgSnippet)

      extractedHtml = planer.extractFromHtml(msgBody, @dom)

      expect(extractedHtml).to.exist
      expect(extractedHtml).to.contain(replySnippet)
      expect(extractedHtml).not.to.contain(originalMsgSnippet)

