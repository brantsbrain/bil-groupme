////////// IMPORTS //////////
const cool = require('cool-ascii-faces')
const {
  helptext, helpregex,
  ballersregex, getBallers,
  createEvent, createRotEvent,
  nextregex, getNextSport,
  rotsportday, getDayOfWeek,
  getSportRotation, sportrotregex, rotsporttimearr,
  createSportsPoll, sportspollregex,
  pinregex, pinsregex, unpinregex, unpin, showPins, likeMessage,
  createTiedPoll, tiebreakertitle,
  locationsregex, getLocations,
  getAdmins, sendDm, getUserId, loguserid, adminregex,
  newbiestext, testregex, versionregex, sleepinsec,
  coolregex, createPost, sportjson, getPollWinner, sleep
} = require("./groupme-api")

////////// INITIALIZE VARS //////////
// Bot info
const version = "May I Take Your Hat Sir? 4.1\nhttps://github.com/brantsbrain/bil-groupme"

// Max attempts to find user id
const maxattempts = 3

// Header values
const firstsportheader = "soccer"
const secondsportheader = "sports"

////////// RESPOND //////////
const respond = async (req, res) => {
  try {
    const request = req.body
    const requesttext = request.text
    const senderid = request.user_id
    const sendername = request.name
    console.log(`User request: "${requesttext}"`)
    console.log(`Request Body: "${JSON.stringify(request)}"`)

    // Auto-create events on cron job POSTs
    const headerkeys = Object.keys(req.headers)
    if (headerkeys.indexOf(firstsportheader) > -1) {
      console.log(`Found ${firstsportheader}...`)
      await createEvent(`Soccer Tuesdays!`, sportjson.sports["Soccer"].location, sportjson.sports["Soccer"].address, 2, 17, 30, 3)
    }
    else if (headerkeys.indexOf(secondsportheader) > -1) {
      console.log(`Found ${secondsportheader}...`)
      await createRotEvent()
    }

    // Get dynamic day of week for sports poll title
    const sportspolltitle = `${await getDayOfWeek(rotsportday)} Sports Poll`

    // If text exists
    if (requesttext) {
      res.writeHead(200)
      await sleep(1500)

      //////////////////// BASE CONTROLS ////////////////////
      // Post a cool face
      if (coolregex.test(requesttext)) {
        await createCoolFaceMessage()
      }

      // Post version defined in bot
      else if (versionregex.test(requesttext)) {
        await createPost(`Current Version: ${version}`)
      }

      // Post help text
      else if (helpregex.test(requesttext)) {
        await createPost(helptext)
      }

      // Show pins
      else if (pinsregex.test(requesttext)) {
        await showPins()
      }

      // Post winning event from sports poll
      else if (requesttext.includes(`'${sportspolltitle}' has expired`)) {
        const winnerarr = await getPollWinner()
        if (winnerarr.length == 1) {
          console.log(`Looking for ${winnerarr[0]}`)
          for (const [key, val] of Object.entries(sportjson.poll)) {
            if (key == winnerarr[0]) {
              await createEvent(val.name, val.location, val.address, rotsportday, rotsporttimearr[0], rotsporttimearr[1], 3)
            }
          }
        }
        else {
          console.log("Poll tied. Creating tiebreaker poll...")
          await sendDm(loguserid, "Poll tied. Creating tiebreaker poll...")
          await createTiedPoll(winnerarr)
        }
      }

      // Handle tiebreaker poll
      else if (requesttext.includes(`'${tiebreakertitle}' has expired`)) {
        const winnerarr = await getPollWinner()
        if (winnerarr.length == 1) {
          console.log(`Looking for ${winnerarr[0]}`)
          for (const [key, val] of Object.entries(sportjson.poll)) {
            if (key == winnerarr[0]) {
              await createEvent(val.name, val.location, val.address, rotsportday, rotsporttimearr[0], rotsporttimearr[1], 3)
            }
          }
        }
        else {
          console.log("Tiebreaker tied. Resolve manually...")
          await sendDm(loguserid, "Tiebreaker tied. Resolve manually...")
        }
      }

      // Send new members welcome DM
      else if (sendername == "GroupMe" && requesttext.includes("group")) {
        // Get name substring
        if (requesttext.includes("added")) {
          var name = requesttext.substring(requesttext.lastIndexOf("added") + 6, requesttext.lastIndexOf("to") - 1)
        }
        else if (requesttext.includes("joined")) {
          var name = requesttext.substring(0, requesttext.lastIndexOf("has") - 1)
        }
        console.log(`Found '${name}' in requesttext`)
        const firstname = name.split(" ")[0]
        
        // Search for user id maxattempts times
        var found = false
        var userid = ""
        for (let attempt = 1; attempt <= maxattempts; attempt++) {
          console.log(`Attempt ${attempt}: Searching for user ID for ${name}...`)
          if (!found) {
            userid = await getUserId(name)
            if (userid) {
              await sendDm(userid, `Hey ${firstname}! ${newbiestext}`)
              await sendDm(loguserid, `Found ${name} on attempt ${attempt}...`)
              console.log(`Found ${name} on attempt ${attempt}...`)
              found = true
            }
            else if (attempt < 3) {
              await sleep(sleepinsec * 1000)
            }
            else {
              await sendDm(loguserid, `Attempted ${attempt} time(s). Couldn't find user ID for ${name}`)
              console.log(`Attempted ${attempt} time(s). Couldn't find user ID for ${name}`)
            }
          }
        }
      }

      // Post previous sports locations
      else if (locationsregex.test(requesttext)) {
        await createPost(await getLocations())
      }

      // Test regex
      else if (testregex.test(requesttext)) {
        await sendDm(loguserid, newbiestext)
      }

      // Post next upcoming Friday sport
      else if (nextregex.test(requesttext)) {
        await getNextSport()
      }

      // Post current sport rotation
      else if (sportrotregex.test(requesttext)) {
        await createPost(await getSportRotation())
      }

      // Mention all admins
      else if (adminregex.test(requesttext)) {
        await createPost(requesttext, await getAdmins())
      }

      //////////////////// ADMIN CONTROLS ////////////////////
      // Mention ballers
      else if (ballersregex.test(requesttext)) {
        const adminarr = await getAdmins()
        if (adminarr.indexOf(senderid) > -1) {
          await createPost(requesttext, await getBallers())
          console.log(`${sendername} ran /ballers`)
        }
        else {
          await sendDm(senderid, `BOT: Sorry ${sendername}, you're not an admin so you can't run /ballers!`)
          await sendDm(loguserid, `${sendername} attempted to run /ballers`)
          console.log(`${sendername} attempted to run /ballers`)
        }
      }

      // Post sports poll
      else if (sportspollregex.test(requesttext)) {
        const adminarr = await getAdmins()
        if (adminarr.indexOf(senderid) > -1) {
          await createSportsPoll()
          console.log(`${sendername} ran /sportspoll`)
        }
        else {
          await sendDm(senderid, `BOT: Sorry ${sendername}, you're not an admin so you can't run /sportspoll!`)
          await sendDm(loguserid, `${sendername} attempted to run /ballers`)
          console.log(`${sendername} attempted to run /sportspoll`)
        }
      }

      // Pin message
      else if (pinregex.test(requesttext)) {
        const adminarr = await getAdmins()
        if (adminarr.indexOf(senderid) > -1) {
          await likeMessage(request.id)
        }
        else {
          await createPost("This is an admin-only command. Pin not recorded")
        }
      }

      // Unpin message
      else if (unpinregex.test(requesttext)) {
        const adminarr = await getAdmins()
        if (adminarr.indexOf(senderid) > -1) {
          var pos = requesttext.match(unpinregex)[1]
          await unpin(parseInt(pos) - 1)
        }
        else {
          await createPost("This is an admin-only command. Can't unpin")
        }
      }

      ////////// NO CONDITIONS MET //////////
      else {
        console.log("requesttext didn't match any regex...")
      }

      res.end()
    }
    // Does not match regex
    else {
      console.log("Don't care")
      res.writeHead(200)
      res.end()
    }
  } catch (error) {
    console.log(error)
  }
}

// Create cool face
const createCoolFaceMessage = async () => {
  const botResponse = cool()
  await createPost(botResponse)
}

exports.respond = respond
