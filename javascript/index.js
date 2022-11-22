const sqlite3 = require('sqlite3')
const open = require('sqlite').open
const fs = require('fs')

const filename = 'contacts.sqlite3'
const numContacts = process.argv[2] // TODO: read from process.argv

const shouldMigrate = !fs.existsSync(filename)

/**
 * Generate `numContacts` contacts,
 * one at a time
 *
 */
function* generateContacts(nbContacts) {
  let i = 1
  while (i <= nbContacts) { // miaou
    yield [`name-${i}`, `email-${i}@domain.tld`]
    i++
  }
}

const migrate = async (db) => {
  console.log('Migrating db ...')
  await db.exec(`
        CREATE TABLE contacts(
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL
         )
     `)
  console.log('Done migrating db')
}

const insertContacts = async (db, nb = numContacts) => {
  console.log('Inserting contacts ...')
  const iterator = generateContacts(nb);

  var sql = "INSERT INTO contacts (name, email) VALUES ";

  const nbQueries = 1000;
  const nberContactsByQueries = nb / nbQueries;
  const listPromises = [];

  for (let i = 0; i < nbQueries; i++) {
    const values = getContactsForQuery(iterator, nberContactsByQueries);
    if (!values.length) break;

    let placeholders = values.map((val) => '(?, ?)').join(',');
    console.log(sql + placeholders, values);
    listPromises.push(db.run(sql + placeholders, values));
  }

  await Promise.all(listPromises);
}

/**
 * Permet de recuperer une partie des contacts (selon la limite passee en parametre)
 * @param {object} iterator
 * @param {number} limitContactsForQuery
 * 
 * @returns {string[][]}
 */
const getContactsForQuery = (iterator, limitContactsForQuery) => {

  const listContacts = [];
  for (i = 0; i < limitContactsForQuery; i++) {

    const contact = iterator.next().value;
    if (!contact) return listContacts;

    listContacts.push(contact);
  }

  return listContacts;
}

const queryContact = async (db) => {
  const start = Date.now()
  const res = await db.get(`SELECT name FROM contacts WHERE email = email-${numContacts}@domain.tld`)
  if (!res || !res.name) {
    console.error('Contact not found')
    process.exit(1)
  }
  const end = Date.now()
  const elapsed = (end - start) / 1000
  console.log(`Query took ${elapsed} seconds`)
}

(async () => {
  const db = await open({
    filename,
    driver: sqlite3.Database
  })
  if (shouldMigrate) {
    await migrate(db)
  }
  await insertContacts(db)
  await queryContact(db)
  await db.close()
})()

module.exports = { migrate, insertContacts }
