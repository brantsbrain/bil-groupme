const {
    getBots,
    createPost
} = require("./groupme-api");

const main = async () => {
    await getBots();
    let msg = "/pray ";

    for (let i = msg.length; i < 1000; i++) {
        if (i < 990) {
            msg += "a";
        } else {
            msg += "b"
        }
    }
    console.log(msg.length);
    await createPost(msg);
}

main();