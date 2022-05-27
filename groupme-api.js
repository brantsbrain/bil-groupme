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

// Get members from the nearest upcoming event
const getBallers = async () => {
  const limit = 5
  const date = new Date().getTime()
  const yesterdaylong = date - 24*60*60*1000
  const yesterday = new Date(yesterdaylong)
  var end_at = yesterday.toISOString()
  console.log(`end_at set to: ${end_at}`)
  const getpath = `/v3/conversations/${groupid}/events/list?end_at=${end_at}&limit=${limit}&token=${accesstoken}`
  const desturl = new URL(getpath, baseurl)
  const response = await got(desturl, {
      responseType: "json"
  })

  console.log(response.body.response)

  // memberarr = response.body.response.events[0].going
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
const createEvent = async() => {
  return
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
const helpregex = /^(\s)*\/help/i
const coolregex = /^(\s)*\/cool/i
const ballersregex = /^(\s)*\/ballers/i

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

// Misc vars
exports.coolregex = coolregex
exports.getBots = getBots
exports.createPost = createPost
exports.getAdmins = getAdmins
