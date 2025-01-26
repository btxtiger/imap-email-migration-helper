/**
 * Steps:
 * 0) Copy the accounts from dist/backup/config.json into a variable
 * 1) Update email and add a suffix _old to each email address and folder name
 * 2) Copy again the accounts from dist/backup/config.json into a variable
 * 3) Update the server to the new imap address
 * 4) Update the passwords from config-new-passwords.txt
 * 5) Write the new config to dist/migrate/config.json
 * 5.5) Rename backup folders according to config-restore-mapping.txt
 * 5.6) Add _old suffix to the backup folders
 * 6) Generate a shell script to migrate each account
 */

let fs = require('fs');
let newImapAddress = process.env.NEW_IMAP_ADDRESS;

let backupConfig = JSON.parse(fs.readFileSync('dist/backup/config.json').toString());
let oldAccounts = structuredClone(backupConfig.accounts);

// Step 1
oldAccounts.forEach(account => {
   account.username = `${account.username}_old`;
   account.local_path = `${account.local_path}_old`;
});

// Step 2
let newAccounts = structuredClone(backupConfig.accounts)
let newPasswordList = fs.readFileSync('config-new-passwords.txt')
   .toString()
   .split("\n")
   .map(password => password.trim())
   .filter(k => k);

if (newPasswordList.length !== newAccounts.length) {
   console.error('!!! Password list length does not match the accounts length !!!');
   process.exit(1);
}

for (let i = 0; i < newAccounts.length; i++) {
   newAccounts[i].password = newPasswordList[i] || 'PASSWORD_LIST_EMPTY';
   newAccounts[i].server = newImapAddress;
}

// Step 5
let migrateConfig = Object.assign({}, backupConfig);
migrateConfig.accounts = [...oldAccounts, ...newAccounts];
fs.mkdirSync('dist/migrate', {recursive: true});
fs.writeFileSync('dist/migrate/config.json', JSON.stringify(migrateConfig, null, 4));

// Step 5.5
let restoreMapping = fs.readFileSync('config-restore-mapping.txt')
   .toString()
   .split("\n")
   .map(line => line.trim())
   .filter(k => k)
   .map(line => line.split('=>'))
   .map(k => k.map(k => k.trim()))
   .filter(k => k);

// Step 6
let shellLines = [];
shellLines.push('#!/bin/sh');
shellLines.push('');
shellLines.push('cd ~/.imap-backup || exit');
shellLines.push('for d in */ ; do');
shellLines.push('    cd "${d%/}" || { echo "Failed to cd into $d"; exit; }');
shellLines.push('');
shellLines.push('    for f in *; do');
shellLines.push('        if [ "$f" = "" ]; then');
shellLines.push('            continue');

for (let mapping of restoreMapping) {
   shellLines.push(`        elif [ "$f" = "${mapping[0]}.mbox" ]; then`)
   shellLines.push(`            if [ ! -e "${mapping[1]}.mbox" ]; then mv "$f" "${mapping[1]}.mbox"; fi`);
   shellLines.push(`        elif [ "$f" = "${mapping[0]}.imap" ]; then`)
   shellLines.push(`            if [ ! -e "${mapping[1]}.imap" ]; then mv "$f" "${mapping[1]}.imap"; fi`);
}

shellLines.push('        fi');
shellLines.push('    done');
shellLines.push('');
shellLines.push('    cd ..');
shellLines.push('done');

shellLines.push('');
shellLines.push('cd ~/.imap-backup || exit');
shellLines.push('for d in */ ; do');
shellLines.push('    d="${d%/}"');
shellLines.push('    if [ ! -e "${d}_old" ]; then');
shellLines.push('        mv "$d" "${d}_old"');
shellLines.push('    else');
shellLines.push('        echo "Target ${d}_old already exists. Skipping $d."');
shellLines.push('    fi');
shellLines.push('done');
shellLines.push('');

shellLines.push('mkdir -p ~/.imap-backup/imap-migrate-logs');
shellLines.push('');

for (let i = 0; i < oldAccounts.length; i++) {
   let oldAccountUsername = oldAccounts[i].username;
   let newAccountUsername = newAccounts[i].username;
   shellLines.push(`echo "Migrating ${oldAccountUsername} to ${newAccountUsername}"`);
   shellLines.push(`imap-backup migrate ${oldAccountUsername} ${newAccountUsername} -v > ~/.imap-backup/imap-migrate-logs/${newAccountUsername}.log 2>&1`);
   shellLines.push('');
}

shellLines.push('');
shellLines.push('echo "Migration done"');
fs.writeFileSync('dist/migrate/imap-migrate.sh', shellLines.join("\n"));

console.log('>> Migration config and shell script generated');
