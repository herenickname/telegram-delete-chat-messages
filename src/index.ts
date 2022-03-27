import { TelegramClient } from 'telegram/client/TelegramClient'
import { StringSession } from 'telegram/sessions'
import { Api } from 'telegram/tl/api'
import { LogLevel } from 'telegram/extensions/Logger'
import { sleep } from 'telegram/Helpers'
import prompts from 'prompts'
import { EntityLike } from 'telegram/define'

const apiId = 127581
const apiHash = '9f6d62762c12ae26b43ca2ed7ab48a11'

const client = new TelegramClient(new StringSession(''), apiId, apiHash, { connectionRetries: 5 })
client.setLogLevel(LogLevel.WARN)

async function main() {
    await client.start({
        phoneNumber: async () => await makeQuestion('Please enter your number'),
        password: async () => await makeQuestion('Please enter your password', true),
        phoneCode: async () => await makeQuestion('Please enter the code you received'),
        onError: onPromptsError
    })

    const availableToClearChats = await getAvailableChats()

    const promptChannelId = await prompts(
        {
            type: 'autocomplete',
            name: 'value',
            message: 'Choose chat',
            choices: availableToClearChats.map((x: any) => ({ value: x.id, title: x.title }))
        },
        { onCancel: onPromptsError }
    )
    const selectedChat = availableToClearChats.find((x) => x.id === promptChannelId.value) as any

    await doClean(selectedChat.id)
    process.exit(0)
}

function onPromptsError(err) {
    console.error(err.message)
    process.exit(-1)
}

async function makeQuestion(text: string, hide = false) {
    const { value } = await prompts(
        {
            type: hide ? 'password' : 'text',
            name: 'value',
            message: text
        },
        { onCancel: onPromptsError }
    )

    return value as string
}

async function getAvailableChats() {
    const allChatsResult = await client.invoke(
        new Api.messages.GetAllChats({
            exceptIds: []
        })
    )

    const availableToClearChats = allChatsResult.chats
        .sort((a: any, b: any) => b.date - a.date)
        .filter((x: any) => !x.kicked && !x.left && !x.deactivated && (x.creator || x.adminRights))

    return availableToClearChats
}

async function doClean(selectedChatId: EntityLike) {
    while (true) {
        const messages = await client.getMessages(selectedChatId, {
            reverse: false,
            limit: 3000
        })

        const messageIds = messages.map((x) => x.id)

        if (!messageIds.length) {
            console.log('Nothing to delete (getMessage is empty)')
            break
        }

        const affectedMessagesEvents = await client.deleteMessages(
            selectedChatId,
            messages.map((x) => x.id),
            { revoke: true }
        )

        const affectedMessagesSum = affectedMessagesEvents.reduce((s, x) => x.ptsCount + s, 0)

        if (affectedMessagesSum === 0) {
            console.log('Nothing to delete (affectedMessages is empty)')
            break
        }

        console.log(`Deleted ${affectedMessagesSum} messages`)
        await sleep(Math.random() * 1000)
    }
}

main()
