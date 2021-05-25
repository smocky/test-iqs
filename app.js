require('dotenv').config();
const asyncRedis = require("async-redis");
const database = asyncRedis.createClient(process.env.REDIS_URL);

const { App } = require('@slack/bolt');

const app = new App({
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    clientId: process.env.SLACK_CLIENT_ID,
    clientSecret: process.env.SLACK_CLIENT_SECRET,
    //appToken: process.env.APP_TOKEN,
   // developerMode: true,
    stateSecret: 'my-state-secret',
    scopes: ['channels:read', 'groups:read', 'channels:manage', 'chat:write', 'channels:history'],
    installationStore: {
        storeInstallation: async (installation) => {
            // change the line below so it saves to your database
            if (installation.isEnterpriseInstall) {
                // support for org wide app installation
                console.log('enterprise install');
                // return installation;
                return await database.set(installation.enterprise.id, installation);
            } else {
                // single team app installation
                console.log('normal install');
                // return installation;
                return await database.set(installation.team.id, JSON.stringify(installation));
            }
            throw new Error('Failed saving installation data to installationStore');
        },
        fetchInstallation: async (installQuery) => {
            console.log('getch: ', installQuery)
            // change the line below so it fetches from your database
            if (installQuery.isEnterpriseInstall && installQuery.enterpriseId !== undefined) {
                // org wide app installation lookup
                console.log('org-wide lookup IQ: ', installQuery);
                let result = await database.get(installQuery.enterpriseId);
                if (result) {
                    result = JSON.parse(result);
                    await database.set(installQuery.enterpriseId, JSON.stringify(Object.assign(result, { lastIQ: installQuery })))
                    return result;
                }
            }
            if (installQuery.teamId !== undefined) {
                // single team app installation lookup
                console.log('single lookup IQ: ', installQuery);
                let result = await database.get(installQuery.teamId);
                if (result) {
                    result = JSON.parse(result);
                    await database.set(installQuery.teamId, JSON.stringify(Object.assign(result, { lastIQ: installQuery })))
                    return result;
                }
            }
            throw new Error('Failed fetching installation');
        },
    },
});

// This will match any message 
app.message('iq', async ({ message, body, say }) => {
    let result = await database.get(body.authorizations[0].team_id);
    if (result) {
        result = JSON.parse(result);
        await say('last IQ was: ```' + JSON.stringify(result.lastIQ, null, 2) + "```");
    }
});

(async () => {
    // Start your app
    await app.start(process.env.PORT || 3005);

    console.log('⚡️ Bolt app is running!');
})();