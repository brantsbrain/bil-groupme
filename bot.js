////////// IMPORTS //////////
const cool = require('cool-ascii-faces')
const {
  helptext, helpregex,
  ballersregex, mentionBallers,
  soccerregex, soccloc,
  eventregex, createEvent,
  getAdmins,
  sendDm,
  coolregex, createPost
} = require("./groupme-api")

////////// INITIALIZE VARS //////////
const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

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
      // Only allow admins to mention ballers
      else if (ballersregex.test(requesttext)) {
        let adminarr = await getAdmins()
        if (adminarr.indexOf(senderid) > -1) {
          await mentionBallers(requesttext)
        }
        else {
          await sendDm(senderid, `Kobe Bot: Sorry ${sendername}, you're not an admin so you can't run /ballers!`)
          console.log(`${sendername} attempted to mention everybody`)
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
