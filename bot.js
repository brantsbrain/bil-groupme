////////// IMPORTS //////////
const cool = require('cool-ascii-faces')
const {
  helptext, helpregex,
  ballersregex, getBallers,
  soccerregex, soccloc,
  eventregex, createEvent,
  getAdmins, sendDm, 
  newbiesregex, newbiestext, getNewbies,
  coolregex, createPost
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
  createEvent("Soccer Tuesdays!", soccloc)
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
        await createEvent(paramarr[1], paramarr[2])
      }

      // Post soccer event
      else if (soccerregex.test(requesttext)) {
        await createEvent("Soccer Tuesdays!", soccloc)
      }

      ////////// ADMIN CONTROLS //////////
      // Mention ballers
      else if (ballersregex.test(requesttext)) {
        let adminarr = await getAdmins()
        if (adminarr.indexOf(senderid) > -1) {
          await createPost(ballersregex, await getBallers())
        }
        else {
          await sendDm(senderid, `Kobe Bot: Sorry ${sendername}, you're not an admin so you can't run /ballers!`)
          console.log(`${sendername} attempted to run /ballers`)
        }
      }

      // Post newbies help text to recently joined/added members
      else if (newbiesregex.test(requesttext)) {
        let adminarr = await getAdmins()
        if (adminarr.indexOf(senderid) > -1) {
          await createPost(newbiestext, await getNewbies())
        }
        else {
          await sendDm(senderid, `Kobe Bot: Sorry ${sendername}, you're not an admin so you can't run /newbies!`)
          console.log(`${sendername} attempted to run /newbies`)
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
