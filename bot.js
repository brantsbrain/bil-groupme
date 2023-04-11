////////// IMPORTS //////////
import {
  helptext, helpregex,
  postInactivityPoll, kickInactive, inactivitypollregex,
  ballersregex, getBallers, changeLoc, changelocregex,
  createEvent, createRotEvent,
  nextregex, getNextSport, returnNextSportPos,
  getDayOfWeek, rotsportday, rotsporthour, rotsportmin, rotsportlength,
  soccerday, soccerhour, soccermin, soccerlength, soccerregex,
  getSportRotation, sportrotregex, cancelUpcoming, cancelregex,
  createSportsPoll, sportspollregex,
  createTiedPoll, tiebreakertitle,
  locationsregex, getLocations, getWeather, weatherregex,
  getMembers, everyoneregex,
  getAdmins, sendDm, getUserId, loguserid, adminregex,
  newbiestext, testregex, versionregex, sleep, sleepinsec, faqregex,
  coolregex, createPost, sportjson, getPollWinner, getTodayDayofWeek
} from "./groupme-api.js"

////////// INITIALIZE VARS //////////
// Bot info
const version = "May I Take Your Hat Sir?\n" +
                "https://github.com/brantsbrain/bil-groupme"

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
    
    // Prep days of the week
    const sportday = await getDayOfWeek(rotsportday)
    const soccerdaystr = await getDayOfWeek(soccerday)
    const today = await getTodayDayofWeek()

    // Get dynamic day of week for sports poll title
    const sportspolltitle = `${await getDayOfWeek(rotsportday)} Sports Poll`

    // Gather headers
    const headerkeys = Object.keys(req.headers)

    ///////////////////////////////////////////////////
    //////////////////// CRON JOBS ////////////////////
    ///////////////////////////////////////////////////
    // Create soccer event
    if (headerkeys.indexOf(firstsportheader) > -1 && today == sportjson.soccer.scheduleday) {
      console.log(`Found ${firstsportheader}...`)
      await createEvent(`Soccer ${soccerdaystr}s!`, sportjson.sports["Soccer"].location, sportjson.sports["Soccer"].address, soccerday, soccerhour, soccermin, soccerlength, sportjson.sports["Soccer"].description)

      // Post winter reminder
      if (sportjson.winter.remind) {
        await createPost(sportjson.winter.note)
      }
    }

    // Check to see if enough players are going. Cancel if not
    else if (headerkeys.indexOf(firstsportheader) > -1 && sportjson.checkgoing && today == sportjson.soccer.checkgoingday) {
      const going = (await getBallers()).length

      if (going < sportjson.sports.Soccer.mintoplay) {
        await createPost(`Minimum players for ${(sportjson.sports.Soccer.id).toLowerCase()} is ${sportjson.sports.Soccer.mintoplay}. Canceling because only ${going} RSVP'd.`)
        await cancelUpcoming()
      }
    }
    
    // Create rotational event
    if (headerkeys.indexOf(secondsportheader) > -1 && today == sportjson.rotsport.scheduleday) {
      console.log(`Found ${secondsportheader}...`)
      await createRotEvent()

      // Post forecast
      if (sportjson.weather.active) {
        await createPost(await getWeather())
      }
    }

    // Check to see if enough players are going. Cancel if not
    const rotsportpos = await returnNextSportPos()
    if (headerkeys.indexOf(secondsportheader) > -1 && today == sportjson.rotsport.checkgoingday) {
      const going = (await getBallers()).length

      if (sportjson.checkgoing && going < sportjson.sports[rotsportpos].mintoplay) {
        await createPost(`Minimum players for ${(sportjson.sports[rotsportpos].id).toLowerCase()} is ${sportjson.sports[rotsportpos].mintoplay}. Canceling because only ${going} RSVP'd.`)
        await cancelUpcoming()
      }
    }

    //////////////////////////////////////////////////
    //////////////////// COMMANDS ////////////////////
    //////////////////////////////////////////////////
    if (requesttext) {
      res.writeHead(200)
      await sleep(1500)

      // Post a cool face
      if (coolregex.test(requesttext)) {
        await createCoolFaceMessage()
      }

      // Post version defined in bot
      else if (versionregex.test(requesttext)) {
        await createPost(`Current Version: ${version}`)
      }

      // Post link to FAQs
      else if (faqregex.test(requesttext)) {
        await createPost(`Link to BIL FAQs: ${sportjson.faqlink}`)
      }

      // Post help text
      else if (helpregex.test(requesttext)) {
        const adjusthelptext = helptext.replace(/#/g, sportday).replace(/~/g, soccerdaystr)
        await createPost(adjusthelptext)
      }

      // Post winning event from sports poll
      else if (requesttext.includes(`'${sportspolltitle}' has expired`)) {
        const winnerarr = await getPollWinner()
        if (winnerarr.length == 1) {
          console.log(`Looking for ${winnerarr[0]}`)
          for (const [key, val] of Object.entries(sportjson.poll)) {
            if (key == winnerarr[0]) {
              await createEvent(val.name, val.location, val.address, rotsportday, rotsporthour, rotsportmin, rotsportlength, val.description)
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
              await createEvent(val.name, val.location, val.address, rotsportday, rotsporthour, rotsportmin, rotsportlength, val.description)
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
              const adjustnewbiestext = newbiestext.replace(/#/g, sportday).replace(/~/g, soccerdaystr)
              await sendDm(userid, `Hey ${firstname}! ${adjustnewbiestext}`)
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

      // Assess inactivity poll
      else if (requesttext.includes(`'Inactivity Poll' has expired`)) {
        console.log("Matched inactivty poll expiration")
        await kickInactive()
      }

      // Post previous sports locations
      else if (locationsregex.test(requesttext)) {
        await createPost(await getLocations())
      }

      // Post weather
      else if (weatherregex.test(requesttext)) {
        await createPost(await getWeather())
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

      ////////////////////////////////////////////////////////
      //////////////////// ADMIN CONTROLS ////////////////////
      ////////////////////////////////////////////////////////
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

      // Post inactivity poll
      else if (inactivitypollregex.test(requesttext)) {
        const adminarr = await getAdmins()
        if (adminarr.indexOf(senderid) > -1) {
          await postInactivityPoll(sportjson.inactivitypoll.numdays)
          console.log(`${sendername} ran /inactivitypoll`)
        }
        else {
          await sendDm(senderid, `BOT: Sorry ${sendername}, you're not an admin so you can't run /inactivitypoll!`)
          await sendDm(loguserid, `${sendername} attempted to run /inactivitypoll`)
          console.log(`${sendername} attempted to run /inactivitypoll`)
        }
      }

      // Cancel upcoming event
      else if (cancelregex.test(requesttext)) {
        const adminarr = await getAdmins()
        if (adminarr.indexOf(senderid) > -1) {
          await cancelUpcoming()
          console.log(`${sendername} ran /cancel`)
        }
        else {
          await sendDm(senderid, `BOT: Sorry ${sendername}, you're not an admin so you can't run /cancel!`)
          await sendDm(loguserid, `${sendername} attempted to run /cancel`)
          console.log(`${sendername} attempted to run /cancel`)
        }
      }

      // Change upcoming event location
      else if (changelocregex.test(requesttext)) {
        const adminarr = await getAdmins()
        if (adminarr.indexOf(senderid) > -1) {
          const match = requesttext.match(changelocregex)
          if (match) {
            console.log("Got regex parameter match")
            const newloc = match[1]
            await changeLoc(newloc)
            await createPost(`LOCATION CHANGE:\n\nWe are going to ${newloc}!`, await getBallers())
          }
          else {
            console.log("Couldn't get regex parameter match")
          }
          console.log(`${sendername} ran /change`)
        }
        else {
          await sendDm(senderid, `BOT: Sorry ${sendername}, you're not an admin so you can't run /change!`)
          await sendDm(loguserid, `${sendername} attempted to run /change`)
          console.log(`${sendername} attempted to run /change`)
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
          await sendDm(loguserid, `${sendername} attempted to run /sportspoll`)
          console.log(`${sendername} attempted to run /sportspoll`)
        }
      }

      // Post soccer event
      else if (soccerregex.test(requesttext)) {
        const adminarr = await getAdmins()
        if (adminarr.indexOf(senderid) > -1) {
          await createEvent(`Soccer ${soccerdaystr}s!`, sportjson.sports["Soccer"].location, sportjson.sports["Soccer"].address, soccerday, soccerhour, soccermin, soccerlength, sportjson.sports["Soccer"].description)
          console.log(`${sendername} ran /soccer`)
        }
        else {
          await sendDm(senderid, `BOT: Sorry ${sendername}, you're not an admin so you can't run /soccer!`)
          await sendDm(loguserid, `${sendername} attempted to run /soccer`)
          console.log(`${sendername} attempted to run /soccer`)
        }
      }

      // Mention everyone
      else if (everyoneregex.test(requesttext)) {
        const adminarr = await getAdmins()
        if (adminarr.indexOf(senderid) > -1) {
          await createPost(requesttext, await getMembers())
        }
        else {
          await sendDm(senderid, `BOT: Sorry ${sendername}, you're not an admin so you can't run /everyone!`)
          await sendDm(loguserid, `${sendername} attempted to run /everyone`)
          console.log(`${sendername} attempted to run /everyone`)
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

export {respond}
