let fs = require('fs');

let baseConfig = {
   "version": "2.2",
   accounts: [],
   "download_strategy": "delay_metadata"
}


// Example Account
/*
      {
         "username": "me@email.com",
         "password": "hi_i_am_password",
         "local_path": "~/.imap-backup/me@email.com",
         "folders": [],
         "mirror_mode": true,
         "server": "imap.ionos.de",
         "multi_fetch_size": 50
      }
 */


let emailList = fs.readFileSync('config-accounts.txt')
   .toString()
   .split("\n")
   .map(email => email.trim())
   .filter(k => k);

// Create account for each email
let accounts = emailList.map(email => {
   return {
      "username": email,
      "password": process.env.OLD_ACCOUNTS_PASSWORD,
      "local_path": `${process.env.HOME_DIR_PATH}/.imap-backup/${email}`,
      "folders": [],
      "mirror_mode": true,
      "server": process.env.OLD_IMAP_ADDRESS,
      "multi_fetch_size": process.env.MULTI_FETCH_SIZE || 1
   }
});

baseConfig.accounts = accounts;

// Write config to dist/config.json, create dir and empty file
fs.mkdirSync('dist/backup', {recursive: true});
fs.writeFileSync('dist/backup/config.json', JSON.stringify(baseConfig, null, 4));

console.log('>> Backup config generated');
