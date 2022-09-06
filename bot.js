////////// IMPORTS //////////
const cool = require('cool-ascii-faces')
const {
  helptext, helpregex,
  ballersregex, getBallers,
  autofri, autotues,
  createEvent, createFridayEvent,
  nextregex, getNextSport, 
  getSportRotation, sportrotregex,
  createSportsPoll, sportspollregex, sportspolltitle,
  createTiedPoll, tiebreakertitle,
  locationsregex, locationtext,
  getAdmins, sendDm, getUserId, loguserid, adminregex,
  newbiestext, testregex, versionregex,
  coolregex, createPost, sportjson, getPollWinner
} = require("./groupme-api")
const nodeCron = require("node-cron")

////////// INITIALIZE VARS //////////
const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Manually adjust as versions improve
const version = "May I Take Your Hat Sir? 1.1"

// Max attempts to find user id
const maxattempts = 3

////////// CRON JOBS //////////
// Adjust +4 hours for UTC
// Post weekly on Monday 8:00 AM EST
const weeklySocc = nodeCron.schedule("0 12 * * 1", function weeklySocc() {
  if (autotues) {
    createEvent("Soccer Tuesdays!", sportjson.sports["Soccer"].location, 2)
  }
  else {
    console.log("Auto weeklySocc turned off...")
  }
})

// Post event or poll weekly on Wednesday at 8:00 AM EST
const weeklySport = nodeCron.schedule("0 12 * * 3", function weeklySport() {
  if (autofri) {
    createFridayEvent()
  }
  else {
    console.log("Auto weeklySport turned off...")
  }
})

////////// RESPOND //////////
const respond = async (req, res) => {
  try {
    const request = req.body
    const requesttext = request.text
    const senderid = request.user_id
    const sendername = request.name
    console.log(`User request: "${requesttext}"`)
    console.log(`Request Body: "${JSON.stringify(request)}"`)

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
        let found = false
        if (requesttext.includes("added")) {
          let name = requesttext.substring(requesttext.lastIndexOf("added") + 6, requesttext.lastIndexOf("to") - 1)
          console.log(`Found '${name}' in requesttext`)

          // Search for user id maxattempts times
          for (let attempt = 1; attempt <= maxattempts; attempt += 1) {
            console.log(`Attempt ${attempt}: Searching for user ID for ${name}...`)
            if (!found) {
              userid = await getUserId(name)
              if (userid) {
                await sendDm(userid, `Hey ${name}! ${newbiestext}`)
                found = true
              }
              else {
                attempt += 1
                await sleep(10000)
              }
            }
            else {
              console.log("Already found user...")
            }
          }
        }
        else if (requesttext.includes("joined")) {
          let name = requesttext.substring(0, requesttext.lastIndexOf("has") - 1)
          console.log(`Found '${name}' in requesttext`)

          // Search for user id maxattempts times
          for (let attempt = 1; attempt <= maxattempts; attempt += 1) {
            console.log(`Attempt ${attempt}: Searching for user ID for ${name}...`)
            if (!found) {
              userid = await getUserId(name)
              if (userid) {
                await sendDm(userid, `Hey ${name}! ${newbiestext}`)
                found = true
              }
              else {
                attempt += 1
                await sleep(10000)
              }
            }
            else {
              console.log("Already found user...")
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
          console.log("Admin ran /ballers")
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
          console.log("Admin ran /sportspoll")
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
