const { Client, GatewayIntentBits } = require('discord.js');
const Database = require("@replit/database")
const db = new Database()
const hedera = require('./hedera.js');
const client = new Client({
    intents: [((1 << 22) - 1)]
});
const token = process.env['DISCORD_BOT_SECRET'];

client.on('ready', () => {
    console.log(client.user.username);
    console.log('is ready.');
});

async function dbset(key, value) {
    await db.set(key, value);
}

async function dbget(key) {
    return await db.get(key);
}

async function dbclean() {
    console.log("Cleaning db...")
    l = await db.list();
    l.forEach(async ele => {
        console.log(ele);
        await db.delete(ele);
    })
}

async function dblist() {
    console.log("Showing db...")
    l = await db.list();
    l.forEach(async ele => {
        console.log(ele);
        dbget(ele).then(console.log);
    })
}

async function checkOrInitAccount(uid, val = 10) {
    obj = await dbget(uid);
    if (obj == null) {
        console.log('Creating new account...')
        console.log(uid)
        obj = await hedera.createAccount(val);
        await dbset(uid, obj);
    }
    console.log("Found account...")
    console.log(obj)
    console.log("...returning object.")
    return obj;
}

async function send$(from_uid, to_uid, amount, channel) {
    from = await checkOrInitAccount(from_uid);
    to = await checkOrInitAccount(to_uid);
    op = await checkOrInitAccount('op');
    await activity(from_uid, from, amount * 0.75, channel, op);
    await activity(to_uid, to, amount * 0.25, channel, op);
    let fee = amount * 0.005;
    amount = amount - fee;
    console.log('transferring...')
    await hedera.transferHbar(from.accountId, from.priKey, to.accountId, amount);
    await hedera.transferHbar(from.accountId, from.priKey, op.accountId, fee);
}

async function activity(uid, user, points, channel, op) {
    user.activity += points;
    await dbset(uid, user);
    t = await dbget('tokens');
    // console.log(t);
    if (user.activity == 0.75) {
        await channel.send("<@" + uid + "> you've leveled up to become a Hedera Pal!");
        //gift a rick 
        await channel.send("<@" + uid + "> you've leveled received a Rick. Type $rick");
        await hedera.transferToken(op.accountId, op.priKey, user.accountId, user.priKey, 1, t.rick);
    } else if (user.activity == 1.5) {
        await channel.send("<@" + uid + "> you've leveled up to become a Hedera Pro!");
        //gift a mute
        await channel.send("<@" + uid + "> you've leveled received a power to mute someone for 5 seconds! Type $mute");
        await hedera.transferToken(op.accountId, op.priKey, user.accountId, user.priKey, 1, t.mute);
    } else if (user.activity == 7.5) {
        await channel.send("<@" + uid + "> you've leveled up to become a Hedera Ultimatum! HAIL HEDERA!");
        //gift a nuke
        await channel.send("<@" + uid + "> you've leveled received the NUKE... Type $nuke...");
        await hedera.transferToken(op.accountId, op.priKey, user.accountId, user.priKey, 1, t.nuke);
    }
}

async function spendToken(uid, tokenId) {
    user = await checkOrInitAccount(uid);
    amount = await hedera.queryAccountBalance(user.accountId, tokenId);
    console.log(amount);
    if (amount > 0) {
        op = await dbget('op');
        user = await dbget(uid);
        await hedera.transferToken(user.accountId, user.priKey, op.accountId, op.priKey, 1, tokenId);
        return true;
    } else {
        return false;
    }
}

async function see$(uid) {
    me = await checkOrInitAccount(uid);
    t = await dbget("tokens");
    let hbar = await hedera.queryAccountBalance(me.accountId);
    let nuke = await hedera.queryAccountBalance(me.accountId, t.nuke);
    let mute = await hedera.queryAccountBalance(me.accountId, t.mute);
    let rick = await hedera.queryAccountBalance(me.accountId, t.rick);
    return { hbar, nuke, mute, rick }
}

client.on('messageCreate', async msg => {
    if (msg.author.id != client.user.id) {
        console.log(msg.content);
        let lnnuke = "https://images-ext-2.discordapp.net/external/Vfs6Bb9D_fm3YDRU0TXtckSQZHZDVKT_DypaouCIoWk/https/cdn.discordapp.com/emojis/1006772629673365556.gif";
        let lnrick = "https://images-ext-1.discordapp.net/external/LWrcV2-4_UDy0x8rbkPuBKtMZkn9gH2taWLCnORm1fs/%3Fv%3D1/https/cdn.discordapp.com/emojis/1006773324514349066.gif";
        let lnmute = "https://images-ext-1.discordapp.net/external/4Lys_fbDzzHpDELOuhR-ynAQwigqv1jqjMKLiJXB6-M/https/cdn.discordapp.com/emojis/1006774244572680192.gif";
        let emnuke = '<a:nuke:1006772629673365556>';
        let emrick = '<a:rick:1006773324514349066>';
        let emmute = '<a:muteme:1006774244572680192>';
        // check for rick roll or mute or is nuked.
        rickarr = await dbget('rick');
        if (rickarr != null) {
            if (null != rickarr.find(function(x) { return x == msg.author.id })) {
                await msg.channel.send(lnrick);
                await msg.react(emrick);
            }
        }
        mutearr = await dbget('mute');
        if (mutearr != null) {
            if (null != mutearr.find(function(x) { return x == msg.author.id })) {
                await msg.delete();
                await msg.channel.send(lnmute);
                await msg.channel.send("<@" + msg.author.id + ">, HAAHA! you've been muted!");
            }
        }
        if (msg.content.startsWith("$send")) {
            console.log("Sending...");
            recepients = msg.mentions.users;
            // console.log(recepients);
            // console.log(recepients.size);
            let amount = parseInt(msg.content.match(/ [0-9]+[ ]*/)[0]);
            var rsp = "sending " + amount + " hbar to:";
            console.log(amount);
            console.log("that amount ^");
            for (var i = 0; i < recepients.size; i++) {
                item = recepients.at(i);
                console.log(item.id);
                rsp = rsp + " " + item.username + "#" + item.discriminator;
            }
            rsp = await msg.channel.send(rsp);
            // console.log(rsp);
            // add something about reaction to confirm
            // will have to jump out to the on reaction add listener
            await send$(msg.author.id, recepients.at(0).id, amount, msg.channel);
        } else if (msg.content.startsWith("$see")) {
            recepients = msg.mentions.users;
            let bal = "";
            if (recepients.size > 0) {
                let seeid = recepients.at(0).id;
                if (seeid == client.user.id) {
                    seeid = 'op';
                }
                bal = await see$(seeid);
            } else {
                bal = await see$(msg.author.id);
            }
            await msg.channel.send("You have: " + bal.hbar + "hbar, " +
                bal.nuke + " nukes" + emnuke +
                bal.mute + " mutes" + emmute +
                bal.rick + " rick rolls" + emrick);
        } else if (msg.content.startsWith("$redpacket")) {
            await checkOrInitAccount(msg.author.id);
            // do something to set up a claimable message with reactions
            // pay out first however many people
        } else if (msg.content == "sudo dbclean") {
            await dbclean();
            console.log("Done clean.");
        } else if (msg.content == "sudo lsdb") {
            await dblist();
            console.log("Done list.")
        } else if (msg.content.startsWith("$rick")) {
            t = await dbget("tokens");
            if (await spendToken(msg.author.id, t.rick)) {
                recepients = msg.mentions.users;
                let arr = [];
                for (var i = 0; i < recepients.size; i++) {
                    item = recepients.at(i);
                    arr.push(item.id);
                }
                await dbset("rick", arr);
                setTimeout(async function() { await dbset("rick", null) }, 8000);
            }
        } else if (msg.content.startsWith("$mute")) {
            t = await dbget("tokens");
            if (await spendToken(msg.author.id, t.mute)) {
                recepients = msg.mentions.users;
                let arr = [];
                for (var i = 0; i < recepients.size; i++) {
                    item = recepients.at(i);
                    arr.push(item.id);
                }
                await dbset("mute", arr);
                setTimeout(async function() { await dbset("mute", null) }, 13000);
            }
        } else if (msg.content.startsWith("$nuke")) {
            t = await dbget("tokens");
            if (await spendToken(msg.author.id, t.nuke    )) {
                await msg.channel.send("3...");
                setTimeout(async function() { await msg.channel.send("2..") }, 1000);
                setTimeout(async function() {
                    await msg.channel.send("1.")
                    await msg.channel.send(lnnuke)
                }, 2200);
                setTimeout(async function() {
                    await msg.channel.delete();
                }, 3220);
            }
        }
    }
});


async function store() {
    console.log("Storing...")
    console.log(process.env['ACCOUNT_ID']);
    let accountId = process.env['ACCOUNT_ID'];
    let priKey = process.env['PRIVATE_KEY'];
    let pubKey = process.env['PUBLIC_KEY'];
    let activity = 666;
    await dbset('op', { accountId, priKey, pubKey, activity })
    let nuke = await hedera.createToken("Nuke", 'NUK', 0, 100);
    let mute = await hedera.createToken("Mute", 'MTE', 0, 100);
    let rick = await hedera.createToken("RickRoll", 'RRL', 0, 100);
    await dbset('tokens', { nuke, mute, rick });
    await see$('op');
    console.log("...end storing.")
};
store()
    .then(client.login(token));
