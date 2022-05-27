const express = require("express")
const {respond} = require("./bot")

const port = Number(process.env.PORT || 5000)
const app = express()

// Parse json payloads
app.use(express.json())

const ping = (res) => {
  res.writeHead(200)
  res.end("Hey, I'm Cool Guy.")
}

app.get("/", (req, res) => {
  ping(res)
})

app.post("/", (req, res) => {
  respond(req, res)
})

app.listen(port, ()=> {
  console.log(`App listening at ${port}`)
})
