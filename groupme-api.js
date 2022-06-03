////////// IMPORTS //////////
require("dotenv").config()
const got = require("got")
const { URL } = require("url")
const https = require("https")

////////// INITIALIZE VARS //////////
const baseurl = "https://api.groupme.com/"
const helptext = "Kobe Commands:\n" +
                  "/ballers - Mention all people going to nearest upcoming event (admin only)\n" +
                  "/help - Uhhh... you're here"

////////// ENVIRONMENT VARS //////////
// Required
const bot_id = process.env.BOT_ID
const accesstoken = process.env.ACCESS_TOKEN
const groupid = process.env.GROUP_ID

// Sport vars
const sportname = process.env.SPORT_NAME
const sportloc = process.env.SPORT_LOC
const sportday = process.env.SPORT_DAY
const sporttime = process.env.SPORT_TIME

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
// Tell the bot to create a post within its group
const createPost = async (message) => {
    console.log(`Creating new post (${message.length}): ${message}`)
    const postPath = "/v3/bots/post"
    const desturl = new URL(postPath, baseurl)

    const response = await got.post(desturl, {
        json: {
            "bot_id": bot_id,
            "text": String(message),
        },
    })

    const statusCode = response.statusCode
    if (statusCode !== 201) {
        console.log(`Error creating a post ${statusCode}`)
    }
}

// Send a DM to a provided user ID on host's behalf
const sendDm = async (userid, slashtext) => {
  console.log(`Creating new mention (${slashtext.length}): ${slashtext}`)
  let text = slashtext.replace("/", "@")
  const recipient_id = String(userid)
  const source_guid = String(Math.random().toString(36).substring(2,34))

  const message = {
    direct_message : {
      recipient_id,
      source_guid,
      text
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

// Get members from the nearest upcoming event
const getBallers = async () => {
  const limit = 5
  const date = new Date().getTime()
  const yesterdaylong = date - 24*60*60*1000
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
  memberdict = response.body.response.members
  console.log(JSON.stringify(memberdict))
  let adminarr = []
  for (const key of Object.entries(memberdict)) {
    if (key[1].roles.indexOf("admin") > -1) {
      console.log(`Found: ${key[1].roles} - ${key[1].user_id} - ${key[1].nickname}`)
      adminarr.push(key[1].user_id)
    }
  }

  return adminarr
}

// Create mention post for people that replied going to the closest event
const mentionBallers = async (slashtext) => {
  console.log(`Creating new mention (${slashtext.length}): ${slashtext}`)
  let text = slashtext.replace("/", "@")
  const message = {
      text,
      bot_id,
      attachments: [{ loci: [], type: "mentions", user_ids: [] }]
    }

  // Get member IDs as an array and push to message variable
  let members = await getBallers()
  for (let i = 0; i < members.length; i++) {
    message.attachments[0].loci.push([i, i + 1])
    message.attachments[0].user_ids.push(members[i])
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

// Post pic from URL
const postPic = async(text) => {
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
const createEvent = async(name, loc) => {
  console.log(`Creating ${name} event`)

  // Need to find the nearest specified day of week
  let day = 2;
  let currentdate = new Date()
  let startdate = new Date(currentdate.getTime())
  let enddate = new Date(currentdate.getTime())
  let deltadays = day - currentdate.getDay()

  const starttime = (17 * 60 * 60 * 1000) + (30 * 60 * 1000)
  const endtime = (19 * 60 * 60 * 1000)

  // First, adjust the date's day of the week to match the desired day
  startdate.setDate(currentdate.getDate() + deltadays)
  enddate.setDate(currentdate.getDate() + deltadays)

  // Next, if the adjusted date is in the past, add 7 days
  if (startdate < currentdate) {
  	startdate.setDate(startdate.getDate() + 7)
    enddate.setDate(enddate.getDate() + 7)
  }

  // startdate.setHours(17, 30, 0)
  // startdate.setMinutes(30)
  // enddate.setHours(20, 0, 0)
  // enddate.setMinutes(0)

  console.log(startdate)
  console.log(enddate)

  const start_at = startdate.toISOString().setHours(17, 30, 0)
  const end_at = enddate.toISOString().setHours(20,0,0)

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
const helpregex = /^(\s)*\/help/i
const coolregex = /^(\s)*\/cool/i

////////// EXPORTS //////////
// Pic vars
exports.postPic = postPic

// Help vars
exports.helpregex = helpregex
exports.helptext = helptext

// Ballers
exports.getBallers = getBallers
exports.ballersregex = ballersregex
exports.mentionBallers = mentionBallers

// Event
exports.eventregex = eventregex
exports.createEvent = createEvent

// Send DM
exports.sendDm = sendDm

// Misc vars
exports.coolregex = coolregex
exports.getBots = getBots
exports.createPost = createPost
exports.getAdmins = getAdmins
