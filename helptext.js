const {getDayOfWeek, rotsportday} = require("./groupme-api")

const sportday = getDayOfWeek(rotsportday)

const helptext = `Bot Commands:\n" +
  "/admins [message] - Mention the admins with a pressing question/comment\n" +
  "/next - Post the next upcoming ${sportday} sport\n" +
  "/rotation - Post the current sport rotation\n" +
  "/locations - Post all previous locations of sports\n" +
  "/pins - Display pinned messages\n" +
  "/version - Display version number and GitHub URL for project\n" +
  "/help - Uhhh... you're here\n" +
  
  "\nAdmin Commands:\n" +
  "/ballers [message] - Mention all people going to nearest upcoming event\n" +
  "/everyone [message] - Mention everyone in the group\n" +
  "/pin [message] - Pin a message to pinboard\n" +
  "/unpin [number] - Unpin an index on the pins list\n" +

  "\nNavigating GroupMe:\n" +
  "Responding to a poll - Click/Tap the group picture in the upper right corner, find 'Polls', and select and cast your vote(s) for the desired options\n" +
  "RSVPing to an event - Click/Tap the group picture in the upper right corner, find 'Calendar', and RSVP to/view the desired event\n" +

  "\nAutomated Features:\n" +
  "Soccer Tuesdays - Mondays at 8:00 AM EST a soccer event is created for the following Tuesday at 5:30 PM EST\n" +
  "${sportday} Sports - Wednesdays at 8:00 AM EST an event or poll is created for the following weekly sport day's sport. If the week is a poll week, upon poll expiration on Thursday 12:00 PM EST the winning sport's event is auto-created. Ties must be resolved manually.`

exports.helptext = helptext