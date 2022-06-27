////////// IMPORTS //////////
require("dotenv").config()
const got = require("got")
const { URL } = require("url")
const https = require("https")

////////// INITIALIZE VARS //////////
const baseurl = "https://api.groupme.com/"
const helptext = "Kobe Commands:\n" +
  "/ballers - Mention all people going to nearest upcoming event (admin only)\n" +
  "/event[:name:location] - Create an event hardcoded for nearest Tuesday 5:30 - 8:30 PM EST (for now)\n" +
  "/soccer - Create soccer event for nearest Tuesday\n" +
  "/newbies - Posts sparknotes of BIL stuff (admin-only)\n" +
  "/help - Uhhh... you're here"

const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

////////// ENVIRONMENT VARS //////////
// Required
const bot_id = process.env.BOT_ID
const accesstoken = process.env.ACCESS_TOKEN
const groupid = process.env.GROUP_ID

// Optional
const soccloc = process.env.SOCC_LOC
const ignoremember = process.env.IGNORE_MEMBER
const newbiestext = process.env.NEWBIES_TEXT

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

  // Prep message as array to accomadate long messages 
  let messagearr = []
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
    // Send message(s) w/ mention(s)
    if (mentionids) {
      console.log(`Creating new mention (${messagearr[i].length}): ${messagearr[i]}`)
      let text = messagearr[i].replace("/", "@")
      var payload = {
        text,
        bot_id,
        attachments: [{ loci: [], type: "mentions", user_ids: [] }]
      }

      for (let i = 0; i < mentionids.length; i++) {
        payload.attachments[0].loci.push([0, messagearr[i].length])
        payload.attachments[0].user_ids.push(mentionids[i])
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
    sleep(2000)
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

// Find users added/joined w/i the past x messages
const getNewbies = async () => {
  let limit = 50
  const getpath = `/v3/groups/${groupid}/messages?limit=${limit}&token=${accesstoken}`
  const desturl = new URL(getpath, baseurl)
  const response = await got(desturl, {
    responseType: "json"
  })

  // console.log(response.body.response)

  const messagearr = response.body.response.messages
  let newbiearr = []

  for (let i = 0; i < messagearr.length; i++) {
    try {
      if (messagearr[i].event.type == "membership.announce.added") {
        let addedusersarr = messagearr[i].event.data.added_users
        for (let y = 0; y < addedusersarr.length; y++) {
          newbiearr.push(addedusersarr[y].id)
        }
      }
      else if (messagearr[i].event.type == "membership.announce.joined") {
        newbiearr.push(messagearr[i].event.data.user.id)
      }
    }
    catch (error) {
      // console.error(error)
    }
  }

  return newbiearr
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
      return key[1].user_id
    }
  }
  console.log(`Couldn't find user ID for ${name}`)
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
const createEvent = async (name, loc) => {
  console.log(`Creating ${name} event`)

  // Need to find the nearest specified day of week (0 == Sun, 6 == Sat)
  let day = 2
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
    "location": { "name": loc }
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

  // Get nearest Thursday at noon
  let day = await nearestDay(4)
  console.log(day)
  console.log(typeof day)
  day.setHours(8, 0, 0)
  
  // Convert to number of seconds since 01/01/1970 
  let milliseconds = day.getTime()
  console.log(milliseconds)
  console.log(typeof milliseconds)
  let expiration = parseInt(milliseconds/1000, 10)
  console.log(expiration)

  const message = {
    "subject": "Friday Sports Poll",
    "options": [
      {"title": "Soccer"},
      {"title": "Ultimate Frisbee"},
      {"title": "Football"},
      {"title": "Kickball"}
    ],
    "expiration": expiration,
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
exports.soccloc = soccloc

// Send DM
exports.sendDm = sendDm
exports.getUserId = getUserId

// Sports poll
exports.createSportsPoll = createSportsPoll
exports.sportspollregex = sportspollregex

// Newbie
exports.newbiesregex = newbiesregex
exports.newbiestext = newbiestext
exports.getNewbies = getNewbies

// Misc vars
exports.coolregex = coolregex
exports.getBots = getBots
exports.createPost = createPost
exports.getAdmins = getAdmins
