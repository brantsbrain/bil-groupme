////////// IMPORTS //////////
require("dotenv").config()
const got = require("got")
const { URL } = require("url")
const https = require("https")

////////// INITIALIZE VARS //////////
// Used to access GroupMe API
const baseurl = "https://api.groupme.com/"

// Posted w/ /help in chat
const helptext = "Kobe Commands:\n" +
  "/ballers - Mention all people going to nearest upcoming event (admin only)\n" +
  // "/event[:name:location] - Create an event hardcoded for nearest Tuesday 5:30 - 8:30 PM EST (for now)\n" +
  "/soccer - Create soccer event for nearest Tuesday\n" +
  // "/newbies - Posts sparknotes of BIL stuff (admin-only)\n" +
  "/sportspoll - Post preconfigured sports poll to expire nearest Wednesday 6:00 PM EST\n" + 
  "/locations - Post all previous locations of sports\n" +
  "/help - Uhhh... you're here\n\n" +
  
  "Navigating GroupMe:\n" +
  "Responding to a poll - Click/Tap the group picture in the upper right corner, find 'Polls', and select and cast your vote(s) for the desired options\n"
  "RSVPing to an event - Click/Tap the group picture in the upper right corner, find 'Calendar', and RSVP to the desired event\n\n" +

  "Automated Features:\n" + 
  "Soccer Tuesdays - Mondays at 8:00 AM EST a soccer event is created for the following Tuesday at 5:30 PM EST\n" +
  "Friday Sports - Wednesdays at 8:00 AM EST an event or poll is created for the following Friday's sport. The current rotation is basketball > volleyball > soccer > poll. If the week is a poll week, upon poll expiration on Thursday 12:00 PM EST the winning sport's event is auto-created."

  // Title for sports poll created every sportjson.count weeks
  const sportspolltitle = "Friday Sports Poll"

  // Allow delay for GroupMe API to update
const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

////////// ENVIRONMENT VARS //////////
// Needed for interaction w/ GroupMe bot
const bot_id = process.env.BOT_ID
const accesstoken = process.env.ACCESS_TOKEN
const groupid = process.env.GROUP_ID

// Optional for ignoring events from a particular user
const ignoremember = process.env.IGNORE_MEMBER

// You can't DM yourself, so provide user id to send log messages to
const loguserid = process.env.LOG_USERID

// Replace ` w/ two newlines since GCP only takes one-line ENV variables
const onelinenewbiestext = process.env.NEWBIES_TEXT
const newbiestext = onelinenewbiestext.replace(/`/g, "\n\n")

// Replace ` w/ two newlines and ~ w/ one newline since GCP only takes one-line ENV variables
const onelinelocationtext = process.env.LOCATION_TEXT
let locationtext = onelinelocationtext.replace(/`/g, "\n\n")
locationtext = locationtext.replace(/~/g, "\n")

// Sport JSON
const sportjsonvar = process.env.SPORT_JSON
const sportjson = JSON.parse(sportjsonvar)

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

////////// FUNCTIONS/METHODS //////////
// Create a post and mention users if ID array is provided
const createPost = async (message, mentionids) => {
  console.log(`Creating new post (${message.length}): ${message}`)
  const postPath = "/v3/bots/post"
  const desturl = new URL(postPath, baseurl)

  // Keep from endless loop in mentions
  if (message[0] == "/") {
    message = message.replace("/", "@")
  }
  
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
    sleep(10000)
    const source_guid = String(Math.random().toString(36).substring(2, 34))
    const message = {
      direct_message: {
        recipient_id,
        source_guid,
        "text" : messagearr[i]
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

// Get members from the nearest upcoming event that isn't deleted 
// or created by ignoremember
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
    else if (eventarr[i]["creator_id"] == ignoremember) {
      console.log("creator_id matches ignoremember... passing...")
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

// Get admins
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

const getUserId = async (name) => {
  console.log(`Searching for user ID for ${name}...`)
  const getpath = `/v3/groups/${groupid}?token=${accesstoken}`
  const desturl = new URL(getpath, baseurl)
  const response = await got(desturl, {
    responseType: "json"
  })

  let memberdict = response.body.response.members

  for (const key of Object.entries(memberdict)) {
    if (key[1].nickname == name) {
      console.log(`Found ${name} with user id ${key[1].user_id}`)
      sendDm(loguserid, `Found ${name} with user id ${key[1].user_id}`)
      return key[1].user_id
    }
  }
  console.log(`Couldn't find user ID for ${name}`)
  sendDm(loguserid, `Couldn't find user ID for '${name}'`)
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

// Create event
const createEvent = async (name, loc, dayofweek) => {
  console.log(`Creating ${name} event`)

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

  // EST is 4 hours behind UTC. Set to desired time
  // Start at 5:30 PM and end at 8:30 PM
  startdate.setHours(21, 30, 0)
  enddate.setDate(enddate.getDate() + 1)
  enddate.setHours(0, 30, 0)

  const start_at = startdate.toISOString()
  const end_at = enddate.toISOString()

  const message = {
    name,
    start_at,
    end_at,
    "is_all_day": false,
    "timezone": "America/Detroit",
    "location": {"name": loc}
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
  let expiration = parseInt(milliseconds/1000, 10)

  // Setup options array
  let options = []
  for (let i = 0; i < sportjson.poll.length; i++) {
    options.push({"title": sportjson.poll[i].id})
  }

  // Prep poll
  const message = {
    "subject": sportspolltitle,
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

// Create Friday event or poll depending on week
const createFridayEvent = async () => {
  // Get nearest Friday
  const upcomingfriday = await nearestDay(5)
  upcomingfriday = new Date(upcomingfriday.getTime())
  console.log(upcomingfriday)

  // Create base EPOCH date and find number of weeks since EPOCH
  const epoch = new Date(0)
  console.log(epoch)
  const msinweek = 1000 * 60 * 60 * 24 * 7
  const diff = (upcomingfriday - epoch) / msinweek
  console.log(diff)

  // Use modulo to navigate sportjson
  const position = diff % sportjson.count
  if (position == sportjson.count - 1) {
    createSportsPoll()
  }
  else {
    createEvent(sportjson.sports[position].name, sportjson.sports[position].location, 5)
  }
}

// Return winner of most recent poll
const getPollWinner = async () => {
  winner = ""
  mostvotes = 0

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
    if (mostrecentpolloptions[i].votes && mostrecentpolloptions[i].votes > mostvotes) {
      mostvotes = mostrecentpolloptions[i].votes
      winner = mostrecentpolloptions[i].title
    }
  }

  return winner
}

// Returns all your bots and their info
const getBots = async () => {
  const grouppath = `/v3/bots?token=${accesstoken}`
  const desturl = new URL(grouppath, baseurl)
  const response = await got(desturl, {
    responseType: "json"
  })
  console.log(response.body.response)
}

////////// REGEX //////////
const ballersregex = /^(\s)*\/ballers/i
const eventregex = /^(\s)*\/event/i
const soccerregex = /^(\s)*\/soccer/i
const helpregex = /^(\s)*\/help/i
const coolregex = /^(\s)*\/cool/i
const newbiesregex = /^(\s)*\/newbies/i
const sportspollregex = /^(\s)*\/sportspoll/i
const locationsregex = /^(\s)*\/locations/i
const testregex = /^(\s)*\/test/i

////////// EXPORTS //////////
// Pic vars
exports.postPic = postPic

// Help vars
exports.helpregex = helpregex
exports.helptext = helptext

// Ballers
exports.getBallers = getBallers
exports.ballersregex = ballersregex

// Event
exports.eventregex = eventregex
exports.createEvent = createEvent
exports.soccerregex = soccerregex
exports.createFridayEvent = createFridayEvent
exports.locationsregex = locationsregex
exports.locationtext = locationtext

// Send DM
exports.sendDm = sendDm
exports.getUserId = getUserId
exports.loguserid = loguserid

// Sports poll
exports.createSportsPoll = createSportsPoll
exports.sportspollregex = sportspollregex
exports.sportjson = sportjson
exports.getPollWinner = getPollWinner
exports.sportspolltitle = sportspolltitle

// Newbie
exports.newbiesregex = newbiesregex
exports.newbiestext = newbiestext

// Misc vars
exports.coolregex = coolregex
exports.getBots = getBots
exports.createPost = createPost
exports.getAdmins = getAdmins
exports.testregex = testregex
