# Bulk IMAP Email Migration Helper

This tool helps to reduce manual effort in migrating IMAP email accounts from one server to another using
[joeyates/imap-backup](https://github.com/joeyates/imap-backup).

## Requirements

- You will need to have node.js installed on your local machine to generate the helper files.
- We will also assume, that you are using a dedicated migration server to run the migration commands
  (when we speak about "your server" in the following steps).
- Install `imap-backup` on your server as [**homebrew** or **Ruby Gem
  **](https://github.com/joeyates/imap-backup?tab=readme-ov-file#installation). Docker is not supported with this tool.

## Prerequisites

- Update the `.env` file with your details.
- Reset the password of all email accounts before starting the migration to your configured `OLD_ACCOUNTS_PASSWORD`.

## 1) Backup the accounts

- List the email accounts in `config-accounts.txt` file. Enter one email address per line.

```shell
node --env-file=.env generate-backup-config.js
```

- The `config.json` to create the backups will be generated in `dist/backup/config.json`
- Copy the file to your server in `~/.imap-backup/` directory.
  Fix the permissions

```shell
chmod 600 ~/.imap-backup/config.json
```

To backup the accounts, run the following command on your server.

```shell
imap-backup -v > ~/.imap-backup/imap-backup.log 2>&1 &
```

This might take a few hours. You can jump into the logs to check the progress.

```shell
tail -f ~/.imap-backup/imap-backup.log
```

## 1.1) Moving the domain

- You should create a cronjob to update the backups constantly until the domain migration is completed.
- Make sure to remove the cronjob before restoring the backups to the new server.
- You might run it multiple times until you can verify, that all accounts are entirely backed up.

```shell
*/2 * * * * imap-backup > ~/.imap-backup/cron-imap-backup.log 2>&1
```

## 1.2) Creating a snapshot

- Once the backups are completed, you can create a snapshot of the local backups before we modify it in the next steps.

```shell
cp -R ~/.imap-backup ~/imap-backup-snapshot-$(date +'%d_%m_%y-%H_%M')
```

## 2) Migrate the accounts

### 2.1) Create a folder mapping

- If you want to restore specific folders to different inboxes, you can list the mappings in
  `config-restore-mapping.json` as follows:

```sh
Entwüfe => Drafts
Gesendete Objekte => Sent
Paperkorb => Trash
```

- This will rename the local backups before migration to the new folder names.
- You should check the folders names on your both server before running the migration.
- The renaming **will not be enforced**, if a folder with this name already exists.

### 2.2) Migrate the passwords

- List the new passwords for each account in `config-new-passwords.txt` file. Enter one password per line.

### 2.3) Generate the migration config

- The latest `dist/backup/config.json` will be used to generate the migration config.

```shell
node --env-file=.env generate-migrate-config.js
```

- The `config.json` to migrate the backups will be generated in `dist/migrate/config.json`
- Copy the `dist/migrate/config.json` to your server in `~/.imap-backup/` directory. Replace the previous config.
- Copy the `dist/migrate/imap-migrate.sh` to `~/` on your server.

### 2.4) Migrate the domain & create new inboxes

- Before the next step, you should move the domain and create the new email accounts on your new server.

### 2.5) Migrate the accounts

```shell
chmod +x imap-migrate.sh && ./imap-migrate.sh > ~/.imap-backup/imap-migrate.log 2>&1 &
```

This might take a few hours aswell. You can jump into the logs to check the progress.

```shell
tail -f ~/.imap-backup/imap-migrate.log
```

An additional detailed log per account will be generated in `~/.imap-backup/imap-migrate-logs/<accont-name>.log`.


