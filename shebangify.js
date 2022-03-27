const fs = require('fs/promises')

async function main() {
    const filename = './dist/index.js'

    let data = await fs.readFile(filename)

    data = '#!/usr/bin/env node\n' + data

    await fs.writeFile(filename, data)
}
main()
