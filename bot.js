////////// IMPORTS //////////
const cool = require('cool-ascii-faces')
const {
  helptext, helpregex,
  ballersregex, getBallers,
  createEvent, createFridayEvent,
  nextregex, getNextSport, 
  getSportRotation, sportrotregex,
  createSportsPoll, sportspollregex, sportspolltitle,
  createTiedPoll, tiebreakertitle,
  locationsregex, locationtext,
  getAdmins, sendDm, getUserId, loguserid, adminregex,
  newbiestext, testregex, versionregex, sleepinsec,
  coolregex, createPost, sportjson, getPollWinner, sleep
} = require("./groupme-api")

////////// INITIALIZE VARS //////////
// Manually adjust as versions improve
const version = "May I Take Your Hat Sir? 1.3"

// Max attempts to find user id
const maxattempts = 3

// Header values
const tuesheader = "tuessoccer"
const friheader = "frisports"

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
    if ((headerkeys.indexOf(tuesheader) > -1)) {
      console.log(`Found ${tuesheader}...`)
      await createEvent("Soccer Tuesdays!", sportjson.sports["Soccer"].location, 2)
    }
    else if ((headerkeys.indexOf(friheader) > -1)) {
      console.log(`Found ${friheader}...`)
      await createFridayEvent()
    }

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

      // Post winning event from sports poll
      else if (requesttext.includes(`'${sportspolltitle}' has expired`)) {
        const winnerarr = await getPollWinner()
        if (winnerarr.length == 1) {
          console.log(`Looking for ${winnerarr[0]}`)
          for (const [key, val] of Object.entries(sportjson.poll)) {
            if (key == winnerarr[0]) {
              await createEvent(val.name, val.location, 5)
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
              await createEvent(val.name, val.location, 5)
            }
          }
        }
        else {
          console.log("Tiebreaker tied. Resolve manually...")
          await sendDm(loguserid, "Tiebreaker tied. Resolve manually...")
        }
      }

      // Send new members welcome DM
      else if (sendername == "GroupMe") {
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
        let found = false
        let userid = ""
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
            else if (attempt < 3){
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
        await createPost(locationtext)
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
          await sendDm(senderid, `Kobe Bot: Sorry ${sendername}, you're not an admin so you can't run /ballers!`)
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
          await sendDm(senderid, `Kobe Bot: Sorry ${sendername}, you're not an admin so you can't run /sportspoll!`)
          await sendDm(loguserid, `${sendername} attempted to run /ballers`)
          console.log(`${sendername} attempted to run /sportspoll`)
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
