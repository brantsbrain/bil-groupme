////////// IMPORTS //////////
require("dotenv").config()
const got = require("got")
const {URL} = require("url")
const https = require("https")

////////// INITIALIZE VARS //////////
// Used to access GroupMe API
const baseurl = "https://api.groupme.com/"

// Title for tiebreaker poll
const tiebreakertitle = "6 Hour Tiebreaker Poll"

// Allow delay for GroupMe API to update
const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

////////// ENVIRONMENT VARS //////////
// Needed for interaction w/ GroupMe bot
const bot_id = process.env.BOT_ID
const accesstoken = process.env.ACCESS_TOKEN
const groupid = process.env.GROUP_ID

// Optional for ignoring events from particular user id(s) separated by comma
const ignoremembersstr = process.env.IGNORE_MEMBERS
const ignorememberarr = ignoremembersstr.split(",")

// You can't DM yourself, so provide user id to send log messages to
const loguserid = process.env.LOG_USERID

// Get day of week as string from integer
const getDayOfWeek = async (num) => {
  return ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][num]
}

// Sport JSON
const sportjson = JSON.parse(process.env.SPORT_JSON)

// Used to control how long to wait when checking for new member IDs
const sleepinsec = parseInt(process.env.SLEEP_IN_SEC)

// Get time/day for rotation sport
const rotsportday = parseInt(process.env.ROT_SPORT_DAY)
const rotsporttimestr = process.env.ROT_SPORT_TIME
const rotsporttimearr = rotsporttimestr.split(",")
for (let i = 0; i < rotsporttimearr.length; i++) {
  rotsporttimearr[i] = parseInt(rotsporttimearr[i])
}

// Get time/day for weekly soccer
const soccerday = parseInt(process.env.SOCCER_DAY)
const soccertimestr = process.env.SOCCER_TIME
const soccertimearr = soccertimestr.split(",")
for (let i = 0; i < soccertimearr.length; i++) {
  soccertimearr[i] = parseInt(soccertimearr[i])
}

// Replace ` w/ two newlines since GCP only takes one-line ENV variables
const onelinenewbiestext = process.env.NEWBIES_TEXT
var newbiestext = onelinenewbiestext.replace(/`/g, "\n\n")

////////// CHECK ENV VARS //////////
if (!accesstoken) {
  console.log("ENV: 'ACCESS_TOKEN' is undefined")
}
if (!groupid) {
  console.log("ENV: 'GROUP_ID' is undefined")
}
if (!bot_id) {
  console.log("ENV: 'BOT_ID' is undefined")
}

/* 
////////// SEND MESSAGES //////////
Send either: 
- a regular post to the GroupMe, 
- a post w/ an array of mention IDs, or
- a DM to a user ID from the bot owner's user ID
*/

// Create a post and mention users if ID array is provided
const createPost = async (message, mentionids) => {
  console.log(`Creating new post (${message.length}): ${message}`)
  const postPath = "/v3/bots/post"
  const desturl = new URL(postPath, baseurl)

  // Keep from endless loop in mentions
  if (message[0] == "/") {
    message = message.replace("/", "@")
  }

  // Replace curly quotes and ellipsis (usually from Apple devices)
  message = message
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2026]/g, '...')

  // Prep message as array to accomadate long messages 
  var messagearr = []
  var currmess = ""
  for (let i = 0; i < message.length; i++) {
    if (currmess.length < 999) {
      currmess += message[i]
    }
    else {
      messagearr.push(currmess)
      currmess = ""
    }
  }
  if (currmess.length > 0) {
    messagearr.push(currmess)
  }

  // Iterate through array as mentions or regular post
  for (let i = 0; i < messagearr.length; i++) {
    sleep(100)
    var text = messagearr[i]

    // Send message(s) w/ mention(s)
    if (mentionids) {
      console.log(`Creating new mention (${messagearr[i].length}): ${messagearr[i]}`)
      var payload = {
        text,
        bot_id,
        attachments: [{ loci: [], type: "mentions", user_ids: [] }]
      }

      for (let y = 0; y < mentionids.length; y++) {
        payload.attachments[0].loci.push([0, messagearr[i].length])
        payload.attachments[0].user_ids.push(mentionids[y])
      }

      console.log(`Mentioning: ${payload.attachments[0].user_ids}`)

      // Prep message as JSON and construct packet
      const json = JSON.stringify(payload)
      const groupmeAPIOptions = {
        agent: false,
        host: "api.groupme.com",
        path: "/v3/bots/post",
        port: 443,
        method: "POST",
        headers: {
          "Content-Length": json.length,
          "Content-Type": "application/json",
          "X-Access-Token": accesstoken
        }
      }

      const req = https.request(groupmeAPIOptions, response => {
        let data = ""
        response.on("data", chunk => (data += chunk))
        response.on("end", () =>
          console.log(`[GROUPME RESPONSE] ${response.statusCode} ${data}`)
        )
      })
      req.end(json)
    }

    // Send regular message(s)
    else {
      var payload = {
        "text": messagearr[i],
        bot_id
      }
      var response = await got.post(desturl, {
        json: payload
      })

      const statusCode = response.statusCode
      if (statusCode !== 201) {
        console.log(`Error creating a post ${statusCode}`)
      }
    }
  }
}

// Send a DM to a provided user ID on host's behalf
const sendDm = async (userid, message) => {
  console.log(`Creating new DM (${message.length}): ${message}`)
  const recipient_id = userid

  // Prep message as array to accomadate long messages 
  var messagearr = []
  var currmess = ""
  for (let i = 0; i < message.length; i++) {
    if (currmess.length < 999) {
      currmess += message[i]
    }
    else {
      messagearr.push(currmess)
      console.log(`Maxed out currmess at ${currmess.length}`)
      currmess = ""
      i -= 1
    }
  }
  if (currmess.length > 0) {
    messagearr.push(currmess)
  }

  for (let i = 0; i < messagearr.length; i++) {
    await sleep(10000)
    const source_guid = String(Math.random().toString(36).substring(2, 34))
    const message = {
      direct_message: {
        recipient_id,
        source_guid,
        "text": messagearr[i]
      }
    }

    // Prep message as JSON and construct packet
    const json = JSON.stringify(message)
    const groupmeAPIOptions = {
      agent: false,
      host: "api.groupme.com",
      path: "/v3/direct_messages",
      port: 443,
      method: "POST",
      headers: {
        "Content-Length": json.length,
        "Content-Type": "application/json",
        "X-Access-Token": accesstoken
      }
    }

    // Send request
    const req = https.request(groupmeAPIOptions, response => {
      let data = ""
      response.on("data", chunk => (data += chunk))
      response.on("end", () =>
        console.log(`[GROUPME RESPONSE] ${response.statusCode} ${data}`)
      )
    })
    req.end(json)
  }
}

/* 
////////// GETTERS //////////
Get: 
- an array of user IDs of members going to the most recently posted event,
- an array of all user IDs,
- an array of admin user IDs for the GroupMe, or
- a user ID from a provided nickname
*/

// Get members as an array from the nearest upcoming event
const getBallers = async () => {
  const limit = 5
  const date = new Date().getTime()
  const yesterdaylong = date - 24 * 60 * 60 * 1000
  const yesterday = new Date(yesterdaylong)
  var end_at = yesterday.toISOString()

  const getpath = `/v3/conversations/${groupid}/events/list?end_at=${end_at}&limit=${limit}&token=${accesstoken}`
  const desturl = new URL(getpath, baseurl)
  const response = await got(desturl, {
    responseType: "json"
  })

  console.log(response.body.response)

  const eventarr = response.body.response.events
  let goodevent = []

  for (var i = 0; i < eventarr.length; i++) {
    if ("deleted_at" in eventarr[i]) {
      console.log(`Found deleted_at in ${JSON.stringify(eventarr[i])}`)
    }
    else if (ignorememberarr.includes(eventarr[i]["creator_id"])) {
      console.log("creator_id in ignorememberarr... passing...")
    }
    else {
      goodevent = eventarr[i]
      console.log(`Found good event: ${JSON.stringify(goodevent)}`)
      break
    }
  }

  const memberarr = goodevent.going
  console.log(`Mentioning this array: ${memberarr}`)

  return memberarr
}

// Get members as an array
const getMembers = async () => {
  const getpath = `/v3/groups/${groupid}?token=${accesstoken}`
  const desturl = new URL(getpath, baseurl)
  const response = await got(desturl, {
      responseType: "json"
  })

  const memberdict = response.body.response.members
  console.log(memberdict)
  let memberarr = []
  for (const key of Object.entries(memberdict)) {
    memberarr.push(key[1].user_id)
  }

  return memberarr
}

// Get admins as an array
const getAdmins = async () => {
  const getpath = `/v3/groups/${groupid}?token=${accesstoken}`
  const desturl = new URL(getpath, baseurl)
  const response = await got(desturl, {
    responseType: "json"
  })

  // Get admin details
  let memberdict = response.body.response.members
  console.log(`Members found: ${JSON.stringify(memberdict)}`)
  let adminarr = []
  for (const key of Object.entries(memberdict)) {
    if (key[1].roles.indexOf("admin") > -1) {
      console.log(`Found admin: ${key[1].roles} - ${key[1].user_id} - ${key[1].nickname}`)
      adminarr.push(key[1].user_id)
    }
  }

  return adminarr
}

// Return user ID string from name
const getUserId = async (name) => {
  const getpath = `/v3/groups/${groupid}?token=${accesstoken}`
  const desturl = new URL(getpath, baseurl)
  const response = await got(desturl, {
    responseType: "json"
  })

  let memberdict = response.body.response.members

  for (const key of Object.entries(memberdict)) {
    if (key[1].nickname == name) {
      console.log(`Found ${name} with user id ${key[1].user_id}`)
      return key[1].user_id
    }
  }
  return false
}

/* 
////////// EVENTS/DAYS //////////
Handle all functions needed for:
- creating events,
- finding appropriate dates,
- finding appropriate sports, and
- polling
*/

// Create event
const createEvent = async (name, loc, address, dayofweek, hour, min, length) => {
  console.log(`Creating ${name} event`)
  console.log(`Start hour: ${hour}, start min: ${min}`)

  // Need to find the nearest specified day of week (0 == Sun, 6 == Sat)
  let day = dayofweek
  let currentdate = new Date()
  let startdate = new Date(currentdate.getTime())
  let enddate = new Date(currentdate.getTime())
  let deltadays = day - currentdate.getDay()

  // Adjust the date's day of the week to match the desired day
  startdate.setDate(currentdate.getDate() + deltadays)
  enddate.setDate(currentdate.getDate() + deltadays)

  // If the adjusted date is in the past, add 7 days
  if (startdate < currentdate) {
    startdate.setDate(startdate.getDate() + 7)
    enddate.setDate(enddate.getDate() + 7)
  }

  // EST is 4 hours behind UTC
  startdate.setHours(hour + 4, min, 0)
  // Adjust end date if end time will be over hour 24
  if (rotsporttimearr[0] + 4 + length >= 24) {
    enddate.setDate(enddate.getDate() + 1)
    enddate.setHours(hour + 4 + length - 24, min, 0)
  }
  else {
    enddate.setHours(hour + 4 + length, min, 0)
  }

  const start_at = startdate.toISOString()
  const end_at = enddate.toISOString()

  const message = {
    name,
    start_at,
    end_at,
    "is_all_day": false,
    "timezone": "America/Detroit",
    "location": {
      address,
      "name": loc
    }
  }

  // Prep message as JSON and construct packet
  const json = JSON.stringify(message)
  const groupmeAPIOptions = {
    agent: false,
    host: "api.groupme.com",
    path: `/v3/conversations/${groupid}/events/create`,
    port: 443,
    method: "POST",
    headers: {
      "Content-Length": json.length,
      "Content-Type": "application/json",
      "X-Access-Token": accesstoken
    }
  }

  // Send request
  const req = https.request(groupmeAPIOptions, response => {
    let data = ""
    response.on("data", chunk => (data += chunk))
    response.on("end", () =>
      console.log(`[GROUPME RESPONSE] ${response.statusCode} ${data}`)
    )
  })
  req.end(json)
}

// Return nearest day of the week based on input
const nearestDay = async (dayofweek) => {
  // Need to find the nearest specified day of week (0 == Sun, 6 == Sat)
  let day = dayofweek
  let currentdate = new Date()
  let startdate = new Date(currentdate.getTime())
  let deltadays = day - currentdate.getDay()

  // Adjust the date's day of the week to match the desired day
  startdate.setDate(currentdate.getDate() + deltadays)

  // If the adjusted date is in the past, add 7 days
  if (startdate < currentdate) {
    startdate.setDate(startdate.getDate() + 7)
  }

  return startdate
}

// Create sports poll
const createSportsPoll = async () => {
  console.log(`Creating poll...`)

  // Get nearest Thursday at 12:00 PM EST
  let day = await nearestDay(4)
  day.setHours(16, 0, 0)

  // Convert to number of seconds since 01/01/1970 
  let milliseconds = day.getTime()
  let expiration = parseInt(milliseconds / 1000, 10)

  // Setup options array
  let options = []
  for (const [key, val] of Object.entries(sportjson.poll)) {
    options.push({"title": val.id})
  } 

  // Prep poll
  const message = {
    "subject": `${await getDayOfWeek(rotsportday)} Sports Poll`,
    options,
    expiration,
    "type": "multi",
    "visibility": "public"
  }

  // Prep message as JSON and construct packet
  const json = JSON.stringify(message)
  const groupmeAPIOptions = {
    agent: false,
    host: "api.groupme.com",
    path: `/v3/poll/${groupid}`,
    port: 443,
    method: "POST",
    headers: {
      "Content-Length": json.length,
      "Content-Type": "application/json",
      "X-Access-Token": accesstoken
    }
  }

  // Send request
  const req = https.request(groupmeAPIOptions, response => {
    let data = ""
    response.on("data", chunk => (data += chunk))
    response.on("end", () =>
      console.log(`[GROUPME RESPONSE] ${response.statusCode} ${data}`)
    )
  })
  req.end(json)
}

// Create rotsportday event or poll depending on week
const createRotEvent = async () => {
  // Get nearest rotsportday
  let upcomingsportday = await nearestDay(rotsportday)
  upcomingsportday = new Date(upcomingsportday.getTime())
  console.log(`Upcoming ${await getDayOfWeek(rotsportday)}: ${upcomingsportday}`)

  // Create base EPOCH date and find number of weeks since EPOCH
  const epoch = new Date(0)
  console.log(`EPOCH: ${epoch}`)
  const msinweek = 604800000
  const diff = (upcomingsportday - epoch) / msinweek
  console.log(`(${await getDayOfWeek(rotsportday)} - EPOCH) / ms in week: ${diff}`)
  const floordiff = Math.floor(diff)
  console.log(`Math.floor(diff): ${floordiff}`)

  // Use modulo to navigate sportjson
  const sportarrlen = Object.keys(sportjson.sports).length
  const position = floordiff % sportarrlen
  console.log(`Sport Position: ${position}`)

  // Get position of Poll in sportjson
  const pollpos = Object.keys(sportjson.sports).indexOf("Poll")
  console.log(`Poll position: ${pollpos}`)

  if (position == pollpos) {
    await createPost("Reminder to only vote for the sport(s) you would attend if it won!")
    await createSportsPoll()
  }
  else {
    const sportkey = Object.keys(sportjson.sports)[position]
    await createEvent(sportjson.sports[sportkey].name, sportjson.sports[sportkey].location, sportjson.sports[sportkey].address, rotsportday, rotsporttimearr[0], rotsporttimearr[1], 3)
  }
}

// Return winner of most recent poll
const getPollWinner = async () => {
  let winnerarr = []
  let mostvotes = -1

  // Get list of polls
  const getpath = `/v3/poll/${groupid}?token=${accesstoken}`
  const desturl = new URL(getpath, baseurl)
  const response = await got(desturl, {
    responseType: "json"
  })

  // Drill to options dictionary of most recent poll
  const mostrecentpolloptions = response.body.response.polls[0].data.options
  console.log(`Poll responses found: ${JSON.stringify(mostrecentpolloptions)}`)

  // Iterate latest poll for most voted sport
  for (let i = 0; i < mostrecentpolloptions.length; i++) {
    // Empty winnerarr, push the current winner, and update mostvotes
    if (mostrecentpolloptions[i].votes && mostrecentpolloptions[i].votes != 0 && mostrecentpolloptions[i].votes > mostvotes) {
      console.log(`Resetting winnerarr, pushing ${mostrecentpolloptions[i].title}, and setting mostvotes to ${mostrecentpolloptions[i].votes}`)
      winnerarr = []
      winnerarr.push(mostrecentpolloptions[i].title)
      mostvotes = mostrecentpolloptions[i].votes
    }
    // Add the tied winner
    else if (mostrecentpolloptions[i].votes && mostrecentpolloptions[i].votes != 0 && mostrecentpolloptions[i].votes == mostvotes) {
      console.log(`Found tie. Adding ${mostrecentpolloptions[i].title}`)
      winnerarr.push(mostrecentpolloptions[i].title)
    }
  }

  return winnerarr
}

// Create a single-vote poll for only the tied sports
const createTiedPoll = async (tiedarr) => {
  console.log(`Creating tied poll...`)

  // Get nearest Thursday at 6:00 PM EST
  let day = await nearestDay(4)
  day.setHours(22, 0, 0)

  // Convert to number of seconds since 01/01/1970 
  let milliseconds = day.getTime()
  let expiration = parseInt(milliseconds / 1000, 10)

  // Setup options array
  let options = []
  for (let i = 0; i < tiedarr.length; i++) {
    options.push({"title": tiedarr[i]})
  } 

  // Prep poll
  const message = {
    "subject": tiebreakertitle,
    options,
    expiration,
    "type": "single",
    "visibility": "public"
  }

  // Prep message as JSON and construct packet
  const json = JSON.stringify(message)
  const groupmeAPIOptions = {
    agent: false,
    host: "api.groupme.com",
    path: `/v3/poll/${groupid}`,
    port: 443,
    method: "POST",
    headers: {
      "Content-Length": json.length,
      "Content-Type": "application/json",
      "X-Access-Token": accesstoken
    }
  }

  // Send request
  const req = https.request(groupmeAPIOptions, response => {
    let data = ""
    response.on("data", chunk => (data += chunk))
    response.on("end", () =>
      console.log(`[GROUPME RESPONSE] ${response.statusCode} ${data}`)
    )
  })
  req.end(json)
}

// Get next sport in rotation
const getNextSport = async () => {
  // Get nearest Friday
  let upcomingfriday = await nearestDay(5)
  upcomingfriday = new Date(upcomingfriday.getTime())
  console.log(`Upcoming Friday: ${upcomingfriday}`)

  // Create base EPOCH date and find number of weeks since EPOCH
  const epoch = new Date(0)
  console.log(`EPOCH: ${epoch}`)
  const msinweek = 604800000
  const diff = (upcomingfriday - epoch) / msinweek
  console.log(`(Friday - EPOCH) / ms in week: ${diff}`)
  const floordiff = Math.floor(diff)
  console.log(`Math.floor(diff): ${floordiff}`)

  // Use modulo to navigate sportjson
  const sportarrlen = Object.keys(sportjson.sports).length
  const position = floordiff % sportarrlen
  console.log(`Sport Position: ${position}`)

  // Get position of Poll in sportjson
  const pollpos = Object.keys(sportjson.sports).indexOf("Poll")
  console.log(`Poll position: ${pollpos}`)

  if (position == pollpos) {
    await createPost("Next up is a poll. Hang tight until Wednesday at 8:00 AM!")
  }
  else {
    const sportkey = Object.keys(sportjson.sports)[position]
    await createPost(`Next sport: ${sportjson.sports[sportkey].id}. Hang tight until Wednesday at 8:00 AM for the event!`)
  }
}

// Get sports rotation
const getSportRotation = async () => {
  const sportarr = Object.keys(sportjson.sports)
  let sportrot = "Our current sport rotation is: "

  for (let i = 0; i < sportarr.length; i++) {
    if (i == sportarr.length - 1) {
      sportrot += `${sportarr[i]}`
    }
    else {
      sportrot += `${sportarr[i]} > `
    }
  }

  return sportrot
}

/* 
////////// MISC //////////
Misc functions
*/

// Get locations as string from sportjson
const getLocations = async () => {
  const sportarr = Object.entries(sportjson.addresses)
  let locations = ""
  for (const [key, val] of sportarr) {
    locations += `${key}:\n`
    for (let i = 0; i < val.length; i++) {
      if (i != val.length - 1) {
        locations += `${val[i]}\n`
      }
      else {
        locations += `${val[i]}\n\n`
      }
    }
  }
  return locations
}

// Post pic from URL
const postPic = async (text) => {
  console.log(`Posting pic`)
  const message = {
    text,
    bot_id
  }

  // Prep message as JSON and construct packet
  const json = JSON.stringify(message)
  const groupmeAPIOptions = {
    agent: false,
    host: "api.groupme.com",
    path: "/v3/bots/post",
    port: 443,
    method: "POST",
    headers: {
      "Content-Length": json.length,
      "Content-Type": "image/jpeg",
      "X-Access-Token": accesstoken
    }
  }

  // Send request
  const req = https.request(groupmeAPIOptions, response => {
    let data = ""
    response.on("data", chunk => (data += chunk))
    response.on("end", () =>
      console.log(`[GROUPME RESPONSE] ${response.statusCode} ${data}`)
    )
  })
  req.end(json)
}

var helptext = `Bot Commands:\n` +
  `/admins [message] - Mention the admins with a pressing question/comment\n` +
  `/next - Post the next upcoming # sport\n` +
  `/rotation - Post the current sport rotation\n` +
  `/locations - Post all previous locations of sports\n` +
  `/version - Display version number and GitHub URL for project\n` +
  `/help - Uhhh... you're here\n` +
  
  `\nAdmin Commands:\n` +
  `/ballers [message] - Mention all people going to nearest upcoming event\n` +
  `/everyone [message] - Mention everyone in the group\n` +

  `\nNavigating GroupMe:\n` +
  `Responding to a poll - Click/Tap the group picture in the upper right corner, find 'Polls', and select and cast your vote(s) for the desired options\n` +
  `RSVPing to an event - Click/Tap the group picture in the upper right corner, find 'Calendar', and RSVP to/view the desired event\n` +

  `\nAutomated Features:\n` +
  `Soccer Tuesdays - Mondays at 8:00 AM EST a soccer event is created for the following Tuesday at 5:30 PM EST\n` +
  `# Sports - Wednesdays at 8:00 AM EST an event or poll is created for the following weekly sport day's sport. If the week is a poll week, upon poll expiration on Thursday 12:00 PM EST the winning sport's event is auto-created. Ties must be resolved manually.`

////////// (LOTS OF) REGEX //////////
const ballersregex = /^(\s)*\/ballers/i
const helpregex = /^(\s)*\/help/i
const coolregex = /^(\s)*\/cool/i
const newbiesregex = /^(\s)*\/newbies/i
const sportspollregex = /^(\s)*\/sportspoll/i
const locationsregex = /^(\s)*\/locations/i
const testregex = /^(\s)*\/test/i
const nextregex = /^(\s)*\/next/i
const sportrotregex = /^(\s)*\/rotation/i
const adminregex = /^(\s)*\/admin/i
const versionregex = /^(\s)*\/version/i
const pinsregex = /^\/pins/i
const pinregex = /^\/pin\s(.+)/i
const unpinregex = /^\/unpin\s?(\d+)\s*$/i
const everyoneregex = /^(\s)*\/everyone/i

////////// EXPORTS //////////
// Pic vars
exports.postPic = postPic

// Everyone
exports.everyoneregex = everyoneregex
exports.getMembers = getMembers

// Sport day
exports.rotsportday = rotsportday
exports.getDayOfWeek = getDayOfWeek
exports.rotsporttimearr = rotsporttimearr

// Soccer
exports.soccerday = soccerday
exports.soccertimearr = soccertimearr

// Help vars
exports.helpregex = helpregex
exports.helptext = helptext
exports.getLocations = getLocations

// Ballers
exports.getBallers = getBallers
exports.ballersregex = ballersregex

// Event
exports.createEvent = createEvent
exports.createRotEvent = createRotEvent
exports.locationsregex = locationsregex
exports.nextregex = nextregex
exports.getNextSport = getNextSport
exports.getSportRotation = getSportRotation
exports.sportrotregex = sportrotregex

// Send DM
exports.sendDm = sendDm
exports.getUserId = getUserId
exports.loguserid = loguserid

// Sports poll
exports.createSportsPoll = createSportsPoll
exports.sportspollregex = sportspollregex
exports.sportjson = sportjson
exports.getPollWinner = getPollWinner
exports.tiebreakertitle = tiebreakertitle
exports.createTiedPoll = createTiedPoll

// Newbie
exports.newbiesregex = newbiesregex
exports.newbiestext = newbiestext
exports.versionregex = versionregex
exports.sleepinsec = sleepinsec

// Misc vars
exports.coolregex = coolregex
exports.createPost = createPost
exports.getAdmins = getAdmins
exports.testregex = testregex
exports.adminregex = adminregex
exports.sleep = sleep
