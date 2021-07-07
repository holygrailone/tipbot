const {Command}                    = require('discord-akairo')
const {React, Wallet, Transaction} = require('../utils')

class TipRandomCommand extends Command
{
    constructor()
    {
        super('tiprandom', {
            aliases  : ['tiprandom', 'giftramdom'],
            channel  : 'guild',
            ratelimit: 2,
            args     : [
                {
                    id     : 'amount',
                    type   : 'number',
                    default: 0
                }
            ]
        })
    }

    async exec(message, args)
    {
        await React.processing(message)

        if (!await Wallet.check(this, message, message.author.id)) {
            return
        }
        const amount = args.amount

        if (amount === 0) {
            await React.error(this, message, `Tip amount incorrect`, `The tip amount is wrongly formatted or missing`)
            return
        }
        if (amount < 0.01) {
            await React.error(this, message, `Tip amount incorrect`, `The tip amount is too low`)
            return
        }

        let recipients = []
        await message.channel.messages.fetch({limit: 20})
            .then(function (lastMessages) {
                for (let [id, lastMessage] of lastMessages) {
                    let add = true

                    if (lastMessage.author.id === message.author.id) {
                        add = false
                    }

                    Wallet.address(lastMessage.author.id).then(recipientAddress => {
                        if (!recipientAddress) {
                            add = false
                        }
                    })

                    if (lastMessage.author.bot) {
                        add = false
                    }

                    if (add && !recipients.includes(lastMessage.author.id)) {
                        recipients.push(lastMessage.author.id)
                    }
                }
            })


        const wallet  = await Wallet.get(this, message, message.author.id)
        const balance = await Wallet.balance(wallet)

        if (parseFloat(amount + 0.001) > parseFloat(balance)) {
            await React.error(this, message, `Insufficient funds`, `The amount exceeds your balance + safety margin (0.001 ${process.env.SYMBOL}). Use the \`${process.env.MESSAGE_PREFIX}deposit\` command to get your wallet address to send some more ${process.env.SYMBOL}. Or try again with a lower amount`)
            return
        }

        const recipient = recipients[Math.floor(Math.random() * recipients.length)]
        if (typeof recipient == 'undefined') {
            await React.error(this, message, `Sorry`, `I couldn't find any users to tip. Please try again when the chat is a bit more active`)
            await message.channel.send(`Wake up people! @${message.author.username} is trying to tip, but nobody is here!`)

            return
        }

        const from = wallet.address
        const to   = await Wallet.recipientAddress(this, message, recipient)

        Transaction.addToQueue(this, message, from, to, amount).then(() => {
            Transaction.runQueue(this, message, message.author.id)
        })
    }
}

module.exports = TipRandomCommand