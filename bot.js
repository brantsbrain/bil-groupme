////////// IMPORTS //////////
const cool = require('cool-ascii-faces')
const {
  helptext, helpregex,
  ballersregex, getBallers,
  soccerregex,
  eventregex, createEvent, createFridayEvent,
  createSportsPoll, sportspollregex, sportspolltitle,
  locationsregex, locationtext,
  getAdmins, sendDm, getUserId, loguserid,
  newbiestext, testregex,
  coolregex, createPost, sportjson, getPollWinner
} = require("./groupme-api")
const nodeCron = require("node-cron")

////////// INITIALIZE VARS //////////
const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

////////// CRON JOBS //////////
// Adjust +4 hours for UTC
// Post weekly on Monday 8:00 AM EST
const weeklySocc = nodeCron.schedule("0 12 * * 1", function weeklySocc() {
  console.log("Creating soccer event...")
  createEvent("Soccer Tuesdays!", sportjson.sports[3].location, 2)
})

// Post event or poll weekly on Wednesday at 8:00 AM EST
  const weeklySport = nodeCron.schedule("0 12 * * 3", function weeklySport() {
  console.log("Creating weekly sport event...")
  sendDm(loguserid, "Attempting to create Friday event...")
  createFridayEvent()
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

      ////////// BASE CONTROLS //////////
      // Post a cool face
      if (coolregex.test(requesttext)) {
        await createCoolFaceMessage()
      }

      // Post help text
      else if (helpregex.test(requesttext)) {
        await createPost(helptext)
      }

      // Post event
      else if (eventregex.test(requesttext)) {
        let paramarr = requesttext.split(":")
        await createEvent(paramarr[1], paramarr[2], paramarr[3])
      }

      // Post soccer event
      else if (soccerregex.test(requesttext)) {
        await createEvent("Soccer Tuesdays!", sportjson.sports[3].location, 2)
      }

      // Post sports poll
      else if (sportspollregex.test(requesttext)) {
        await createSportsPoll()
      }

      // Post winning event from sports poll
      else if (requesttext.includes(`'${sportspolltitle}' has expired`)) {
        winner = await getPollWinner()
        console.log(`Looking for ${winner}`)
        for (let i = 0; i < sportjson.poll.length; i++) {
          if (winner.includes(sportjson.poll[i].id)) {
            await createEvent(sportjson.poll[i].name, sportjson.poll[i].location, 5)
          }
        }
      }

      // Send new members welcome DM
      else if (sendername == "GroupMe") {
        if (requesttext.includes("added")) {
          let name = requesttext.substring(requesttext.lastIndexOf("added") + 6, requesttext.lastIndexOf("to") - 1)
          console.log(`Found '${name}' in requesttext`)
          sendDm(await getUserId(name), newbiestext)
        }
        else if (requesttext.includes("joined")) {
          let name = requesttext.substring(0, requesttext.lastIndexOf("has") - 1)
          console.log(`Found '${name}' in requesttext`)
          sendDm(await getUserId(name), newbiestext)
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

      ////////// ADMIN CONTROLS //////////
      // Mention ballers
      else if (ballersregex.test(requesttext)) {
        let adminarr = await getAdmins()
        if (adminarr.indexOf(senderid) > -1) {
          await createPost(requesttext, await getBallers())
        }
        else {
          await sendDm(senderid, `Kobe Bot: Sorry ${sendername}, you're not an admin so you can't run /ballers!`)
          await sendDm(loguserid, `${sendername} attempted to run /ballers`)
          console.log(`${sendername} attempted to run /ballers`)
        }
      }

      ////////// NO CONDITIONS MET //////////
      else {
        console.log("Just chilling... doing nothing...")
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
