exports.DELIMITER = new RegExp('\r?\n')

exports.FWD = new RegExp("^[-]+[ ]*Forwarded message[ ]*[-]+$", 'im')

# On {date}, {somebody} wrote:
exports.ON_DATE_SMB_WROTE = new RegExp("(-*[>]?[ ]?(On|Le|W dniu|Op|Am|P\xe5|Den)[ ].*(,|u\u017cytkownik)(.*\n){0,2}.*(wrote|sent|a \xe9crit|napisa\u0142|schreef|verzond|geschreven|schrieb|skrev):?-*)")
# On {date} wrote {somebody}:
exports.ON_DATE_WROTE_SMB = new RegExp('(-*[>]?[ ]?(Op|Am)[ ].*(.*\n){0,2}.*(schreef|verzond|geschreven|schrieb)[ ]*.*:)')

exports.QUOTATION = new RegExp('((?:s|(?:me*){2,}).*me*)[te]*$')
exports.EMPTY_QUOTATION = new RegExp('((?:s|(?:me*){2,}))e*')

exports.ORIGINAL_MESSAGE = new RegExp('[\\s]*[-]+[ ]*(Original Message|Reply Message|Urspr\xfcngliche Nachricht|Antwort Nachricht|Oprindelig meddelelse)[ ]*[-]+', 'i')
exports.FROM_COLON_OR_DATE_COLON = new RegExp('(_+\r?\n)?[\\s]*(:?[*]?From|Van|De|Von|Fra|Fr\xe5n|Date|Datum|Envoy\xe9|Skickat|Sendt)[\\s]?:[*]? .*', 'i')

exports.DATE_PERSON = new RegExp('(\\d+/\\d+/\\d+|\\d+\\.\\d+\\.\\d+).*@')
exports.SPELLED_OUT_DATE = new RegExp('\\S{3,10}, \\d\\d? \\S{3,10} 20\\d\\d,? \\d\\d?:\\d\\d(:\\d\\d)?( \\S+){3,6}@\\S+:')

exports.LINK = new RegExp('<(https?://[^>]*)>')
exports.NORMALIZED_LINK = new RegExp('@@(https?://[^>@]*)@@')
exports.PARENTHESIS_LINK = new RegExp('\\(https?://')

exports.QUOT_PATTERN = new RegExp('^>+ ?')
exports.NO_QUOT_LINE = new RegExp('^[^>].*[\S].*')

exports.SPLITTER_PATTERNS = [
  exports.ORIGINAL_MESSAGE,
  exports.DATE_PERSON,
  exports.ON_DATE_SMB_WROTE,
  exports.ON_DATE_WROTE_SMB,
  exports.FROM_COLON_OR_DATE_COLON,
  exports.SPELLED_OUT_DATE
]

exports.BEGIN_FROM_OR_DATE = new RegExp('^From:|^Date')
