require('dotenv').config();
const redis = require("redis");
// Production Redis DB
const database = redis.createClient({
    url: process.env.REDIS_URL,
    socket: {
        tls: true,
        rejectUnauthorized: false
    }
});

const { App } = require('@slack/bolt');

const app = new App({
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    clientId: process.env.SLACK_CLIENT_ID,
    clientSecret: process.env.SLACK_CLIENT_SECRET,
    authVersion: 'v2',
    stateSecret: 'my-state-secret',
    scopes: ['channels:read', 'groups:read', 'channels:manage', 'chat:write', 'channels:history'],
    installerOptions: {
        stateVerification: false,
    },
    installationStore: {
        storeInstallation: async (installation) => {
            // change the line below so it saves to your database
            if (installation.isEnterpriseInstall) {
                // support for org wide app installation
                console.log('enterprise install');
                // return installation;
                return await database.set(installation.enterprise.id, JSON.stringify(installation));
            } else {
                // single team app installation
                console.log('normal install');
                // return installation;
                return await database.set(installation.team.id, JSON.stringify(installation));
            }
            throw new Error('Failed saving installation data to installationStore');
        },
        fetchInstallation: async (installQuery) => {
            // change the line below so it fetches from your database
            if (installQuery.isEnterpriseInstall && installQuery.enterpriseId !== undefined) {
                // org wide app installation lookup
                let result = await database.get(installQuery.enterpriseId);
                if (result) {
                    result = JSON.parse(result);
                    return result;
                }
            }
            if (installQuery.teamId !== undefined) {
                // single team app installation lookup
                let result = await database.get(installQuery.teamId);
                if (result) {
                    result = JSON.parse(result);
                    return result;
                }
            }
            throw new Error('Failed fetching installation');
        },
    },
});

// This will match any message 
app.message('iq', async ({ message, body, say }) => {
    await say('last message body.authorizations was: ```' + JSON.stringify(body.authorizations, null, 2) + "```");

});

(async () => {
    // Start your app
    await app.start(process.env.PORT || 3005);

    console.log('⚡️ Bolt app is running!');
})();