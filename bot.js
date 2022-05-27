////////// IMPORTS //////////
const cool = require('cool-ascii-faces')
const {
  helptext, helpregex,
  ballersregex, mentionBallers,
  getAdmins, postPic,
  coolregex, createPost
} = require("./groupme-api")

////////// INITIALIZE VARS //////////
// Declare quiet boolean
let quiet = true

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
    const notadmin = `You ain't the boss of me, ${sendername}!`
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

      ////////// ADMIN CONTROLS //////////
      // Only allow admins to mention ballers
      else if (ballersregex.test(requesttext)) {
        let adminarr = await getAdmins()
        if (adminarr.indexOf(senderid) > -1) {
          await mentionBallers(requesttext)
        }
        else {
          createPost(`You're not an admin, ${sendername}!`)
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
