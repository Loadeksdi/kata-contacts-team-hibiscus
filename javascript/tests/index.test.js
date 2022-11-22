const { migrate, insertContacts } = require("..");
const sqlite3 = require('sqlite3')
const open = require('sqlite').open
const fs = require('fs')

jest.setTimeout(60000);

describe('Contacts insertion', () => {
    let db;
    const filename = 'contacts.sqlite3'
    const shouldMigrate = !fs.existsSync(filename)
    beforeAll(async () => {
        db = await open({
            filename,
            driver: sqlite3.Database
        })
        if (shouldMigrate) {
            await migrate(db)
        }
    })
    afterAll(async () => {
        //await db.run('DROP TABLE contacts');
        await db.close();
    })
    it.each([10, 100, 10000, 50000, 100000])('Measure insert time for multiple values', async (numbers) => {
        await insertContacts(db, numbers)
        const start = Date.now()
        await db.get(`SELECT name FROM contacts WHERE email = email-${numbers}@domain.tld`);
        const end = Date.now()
        const elapsed = (end - start) / 1000
        console.log(`Query for ${numbers} of contacts took ${elapsed} seconds`)
        expect(await db.get('SELECT COUNT(*) FROM contacts')).toBe(numbers);
    });

});