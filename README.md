# GroupMe Sports Bot

The heart behind this bot was to be able to moderate a large group of people looking to get involved in sports events without spamming those who couldn't make it to any one given event. 

The primary functionality of this app is `/ballers` which mentions only those people who have marked themselves as `Going` to the nearest upcoming event. GroupMe has a built-in mention feature, but, as it stands currently, a member would have to individually mention each desired member. `/ballers` compiles an array of members and mentions all these people with a simple `@ballers` instead.

Another helpful feature is the automatic notification for new members; The bot will send a direct message to every new member that joins with the contents of `NEWBIES_TEXT`, a config variable added to Heroku. This text is best used as welcome message describing the group's purpose and any regular activities that occur in it.

We are constantly looking for ways to improve on current functionality and implement new functionality. We know we're not JS pros! Please create an issue or submit a pull request if you'd like to contribute to the repo!

## Commands

| Command Usage | Purpose |
| ------------- | ------- |
| `/ballers [message to mention ballers]` | Mentions all members who have marked themselves as `Going` to the nearest upcoming event |
| `/event [:name:location]` | Creates an event hardcoded for the nearest Tuesday 5:30 - 8:30 PM EST (for now) |
| `/soccer` | Creates a soccer event on the nearest upcoming Tuesday at `SOCC_LOC` 5:30 - 8:30 PM EST |
| `/help` | Posts an abbreviated version of the above commands' usage

---

## Implementation/Setup

### Prerequisites:

| Tool | Website | Purpose |
| ---- | ------- | ------- |
| GitHub Account | [www.github.com](www.github.com) | Hosts the JS code that deploys to Heroku |
| GroupMe Developer Account | [dev.groupme.com](dev.groupme.com) | Integrates bot into GroupMe chats and forwards messages to Heroku callback URL |
| Heroku Personal Use Account | [www.heroku.com](www.heroku.com) | Platform as a Service (PaaS) to receive messages from GroupMe bot and respond using JS app

### 1. Forking GitHub Repo

1. Fork the `prod` branch of `brantsbrain/bil-groupme` to your own GitHub account

### 2. Prepping Heroku App

1. Browse to [dashboard.heroku.com](dashboard.heroku.com) > New > Create New App
2. Give the app a unique name and click Create
3. Connect to GitHub by browsing to Deploy > Deployment Method > GitHub and sign in using your GitHub credentials
4. Attach the forked `bil-groupme/prod` repo to the app
5. Make note of the Heroku app URL under Settings > Domains

### 3. Creating GroupMe Bot

1. Browse to [dev.groupme.com](dev.groupme.com) > Bots > Create Bot
2. Choose the desired chat for the bot (Note: You must be the owner or an admin of the chat to add a bot)
3. Give the bot a name that will appear with each posted message in your chat
4. Insert the URL found in step 5 of `Prepping Heroku App` for the `Callback URL` field
5. `Avatar URL` is optional, but must be an absolute URL path to an image format file (i.e., ending with .jpeg, .png, etc.)
6. Click `Submit` and check the desired GroupMe chat to ensure the bot was added

### 4. Addtional Prep and Deploying Heroku App

1. In the Heroku app, browse to Settings > Config Vars > Reveal Config Vars
2. `bil-groupme` has three required and one optional Config Var: 
    | Config Var | Location |
    | ---------- | -------- |
    | ACCESS_TOKEN | [dev.groupme.com](dev.groupme.com) > Access Token |
    | BOT_ID | [dev.groupme.com](dev.groupme.com) > Bots > Created Bot > Bot ID |
    | GROUP_ID | [dev.groupme.com](dev.groupme.com) > Bots > Created Bot > Group Id |
    | SOCC_LOC (Optional) | A street address for soccer games |
3. Insert the Config Var as the `KEY` and the location values as the `VALUE`
4. Deploy the Heroku app by going to Deploy > Manual Deploy > Deploy Branch (Note: You should be deploying the `prod` branch)
5. You can optionally `Enable Automatic Deploys` to automatically redeploy the branch after any changes are merged to the GitHub repo

### 5. Testing

1. In the Heroku app, open More > View Logs. The window should be populating with data and eventually say something to the effect of `App listening at XXXX` and `State changed from starting to up`. This means the bot is up and listening for requests from the GroupMe bot. Keep this window up
2. In the GroupMe chat, test the bot by running a `/help`. You should get a response from the bot with a list of commands you're able to run

---

## Acknowledgements and Disclaimers

Acknowledgements
- brantsbrain
- justinmooney3096

Disclaimer

*This code is provided as is and is not guaranteed in any fashion. We are not responsible for any misuse of or any unwanted actions taken by the code in applications of it*