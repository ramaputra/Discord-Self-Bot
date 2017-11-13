// Copyright (C) 2017 Favna
// 
// This file is part of Discord-Self-Bot.
// 
// Discord-Self-Bot is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// 
// Discord-Self-Bot is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// 
// You should have received a copy of the GNU General Public License
// along with Discord-Self-Bot.  If not, see <http://www.gnu.org/licenses/>.
// 

const Commando = require('discord.js-commando');
const Discord = require("discord.js");
const path = require('path');
const oneLine = require('common-tags').oneLine;
const sqlite = require('sqlite');
const moment = require('moment');
const auth = require(path.join(__dirname + '/auth.json'));
const data = require(path.join(__dirname + '/data.json'));
const ownerID = auth.ownerID;
const validTypes = ["PLAYING", "STREAMING", "WATCHING", "LISTENING"];
const hookClient = new Discord.WebhookClient(auth.webhookID, auth.webhooktoken, {
    disableEveryone: true
});

class discordSelfBot {
    constructor(token) {
        this.bootTime = new Date();
        this.token = auth.token;
        this.client = new Commando.Client({
            owner: auth.ownerID,
            commandPrefix: '$',
            selfbot: true
        });

        // flags if connected and client is ready
        this.isReady = false;
    }

    onReady() {
        return (() => {
            console.log(`Client ready; logged in as ${this.client.user.username}#${this.client.user.discriminator} (${this.client.user.id})`);
            this.client.user.setAFK(true); // Set bot to AFK to enable mobile notifications

            if (!data.richPresenceEnabled) {
                this.client.user.setPresence({
                    activity: {
                        name: data.richpresenceData.name !== null || data.richpresenceData.name !== "" ? data.richpresenceData.name : "Discord-Self-Bot",
                        type: data.richpresenceData.type !== null || validTypes.includes(data.richpresenceData.type) ? data.richpresenceData.type : 'PLAYING',
                        url: data.richpresenceData.url !== null || data.richpresenceData.url !== "" ? data.richpresenceData.url : null
                    }
                });
            } else {
                this.client.user.setPresence({
                    activity: {
                        application: data.richpresenceData.application !== null || data.richpresenceData.application !== "" ? data.richpresenceData.application : "355326429178757131",
                        name: data.richpresenceData.name !== null || data.richpresenceData.name !== "" ? data.richpresenceData.name : "Discord-Self-Bot",
                        type: data.richpresenceData.type !== null || validTypes.includes(data.richpresenceData.type) ? data.richpresenceData.type : 'WATCHING',
                        url: data.richpresenceData.url !== null || data.richpresenceData.url !== "" ? data.richpresenceData.url : null,
                        details: data.richpresenceData.details !== null || data.richpresenceData.details !== "" ? data.richpresenceData.details : "Made by Favna",
                        state: data.richpresenceData.state !== null || data.richpresenceData.state !== "" ? data.richpresenceData.state : "http://selfbot.favna.xyz",
                        timestamps: data.richpresenceData.startDate === null && data.richpresenceData.endDate === null ? null : {
                            start: data.richpresenceData.startDate !== null ? data.richpresenceData.startDate : null,
                            end: data.richpresenceData.endDate !== null ? data.richpresenceData.endDate : null
                        },
                        assets: {
                            largeImage: data.richpresenceData.largeImage !== null || data.richpresenceData.largeImage !== "" ? data.richpresenceData.largeImage : "355327858534645760",
                            smallImage: data.richpresenceData.smallImage !== null || data.richpresenceData.smallImage !== "" ? data.richpresenceData.smallImage : "355327858534645760",
                            largeText: data.richpresenceData.largeText !== null || data.richpresenceData.largeText !== "" ? data.richpresenceData.largeText : "See the website",
                            smallText: data.richpresenceData.smallText !== null || data.richpresenceData.largeText !== "" ? data.richpresenceData.smallText : "Or the GitHub"
                        },
                        party: data.richpresenceData.partySize.current === null || data.richpresenceData.partySize.max === null ? null : {
                            size: [data.richpresenceData.partySize.current, data.richpresenceData.partySize.max]
                        }
                    }
                });
            }

            this.isReady = true;
        })
    }

    onCommandPrefixChange() {
        return (guild, prefix) => {
            console.log(oneLine `
			Prefix ${prefix === '' ? 'removed' : `changed to ${prefix || 'the default'}`}
			${guild ? `in guild ${guild.name} (${guild.id})` : 'globally'}.
		`);
        }
    }

    onDisconnect() {
        return (() => {
            console.warn('Disconnected!');
        })

    }

    onReconnect() {
        return (() => {
            console.warn('Reconnecting...');
        })
    }

    onCmdErr() {
        return (cmd, err) => {
            if (err instanceof Commando.FriendlyError) return;
            console.error(`Error in command ${cmd.groupID}:${cmd.memberName}`, err);
        }
    }

    onCmdBlock() {
        return (msg, reason) => {
            console.log(oneLine `
		Command ${msg.command ? `${msg.command.groupID}:${msg.command.memberName}` : ''}
		blocked; ${reason}
	`);
        }
    }

    onCmdStatusChange() {
        return (guild, command, enabled) => {
            console.log(oneLine `
            Command ${command.groupID}:${command.memberName}
            ${enabled ? 'enabled' : 'disabled'}
            ${guild ? `in guild ${guild.name} (${guild.id})` : 'globally'}.
        `);
        }
    }

    onGroupStatusChange() {
        return (guild, group, enabled) => {
            console.log(oneLine `
            Group ${group.id}
            ${enabled ? 'enabled' : 'disabled'}
            ${guild ? `in guild ${guild.name} (${guild.id})` : 'globally'}.
        `);
        }
    }

    onmessage() {
        return (msg) => {
            // Notifies user when someone drops their name without a mention
            if (msg.author.id !== ownerID && msg.content.toLowerCase().indexOf(this.client.user.username.toLowerCase()) !== -1 && !msg.mentions.users.get(ownerID)) {
                let mentionEmbed = new Discord.MessageEmbed();

                mentionEmbed
                    .setAuthor(msg.channel.type === 'text' ? `${msg.member.displayName} dropped your name in #${msg.channel.name} in ${msg.guild.name}` : `${msg.author.username} sent a message with your name`, msg.author.displayAvatarURL())
                    .setFooter(`Message dates from ${moment(msg.createdAt).format('MMMM Do YYYY | HH:mm:ss')}`)
                    .setColor(msg.channel.type === 'text' ? msg.member.displayHexColor : '#535B62')
                    .setThumbnail(msg.author.displayAvatarURL())
                    .addField('Message Content', msg.cleanContent.length > 1024 ? msg.cleanContent.slice(0, 1024) : msg.cleanContent)
                    .addField('Message Attachments', msg.attachments.first() !== undefined && msg.attachments.first().url !== undefined ? msg.attachments.map(au => au.url) : 'None');

                hookClient.send(`Stalkify away <@${ownerID}>`, {
                    embeds: [mentionEmbed]
                }).catch(console.error);
            }
        }
    }

    init() {
        this.client
            .on('ready', this.onReady())
            .on('commandPrefixChange', this.onCommandPrefixChange())
            .on('error', console.error)
            .on('warn', console.warn)
            .on('debug', console.log)
            .on('disconnect', this.onDisconnect())
            .on('reconnecting', this.onReconnect())
            .on('commandError', this.onCmdErr())
            .on('commandBlocked', this.onCmdBlock())
            .on('commandStatusChange', this.onCmdStatusChange())
            .on('groupStatusChange', this.onGroupStatusChange());

        data.webhookNotifiers ? this.client.on('message', this.onmessage()) : null;

        this.client.setProvider(
            sqlite.open(path.join(__dirname, 'settings.sqlite3')).then(db => new Commando.SQLiteProvider(db))
        ).catch(console.error);

        this.client.registry
            .registerGroups([
                ['info', 'Information Commands'],
                ['search', 'Web Searching Commands'],
                ['fun', 'Fun and Games Commands'],
                ['misc', 'Miscellanious Commands'],
                ['pokedex', 'PokéDex Lookup Commands'],
                ['links', 'Quick Website Links'],
                ['memes', 'React with meme images'],
                ['status', 'Status setting commands'],
                ['themeplaza', 'Various commands to browse ThemePlaza'],
                ['emojis', '"Global" emojis as images'],
                ['nsfw', 'NSFW finding commands']
            ])
            .registerDefaultGroups()
            .registerDefaultTypes()
            .registerDefaultCommands({
                help: true,
                prefix: true,
                ping: true,
                eval_: true,
                commandState: true
            })
            .registerCommandsIn(path.join(__dirname, 'commands'));

        return this.client.login(this.token);
    }

    deinit() {
        // disconnect gracefully
        this.isReady = false;
        // return the promise from "destroy()"
        return this.client.destroy();
    }
}

module.exports = discordSelfBot